-- Wishlist details and the want → owned → sold/disposed lifecycle.

alter table public.items
  add column wish_price_yen bigint check (wish_price_yen between 0 and 1000000000000),
  add column source_url text check (source_url is null or (char_length(source_url) <= 2000 and source_url ~* '^https?://')),
  add column priority smallint check (priority between 1 and 3);

comment on column public.items.wish_price_yen is 'Candidate price while the item is on the wishlist (JPY).';
comment on column public.items.source_url is 'Store or source URL for the item (http/https only).';
comment on column public.items.priority is 'Wishlist priority: 1 = high, 2 = medium, 3 = low.';

-- Atomically changes an item's status and records the matching timeline event.
--   purchase:        wishlist → owned
--   sale / disposal: owned or borrowed → archived
-- Runs with the caller's privileges (security invoker), so RLS still applies.
create or replace function public.record_item_transition(
  p_item_id uuid,
  p_type public.item_event_type,
  p_occurred_on date,
  p_title text,
  p_amount_yen bigint default null,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_type = 'purchase' then
    update public.items set status = 'owned'
    where id = p_item_id and user_id = v_user_id and status = 'wishlist';
  elsif p_type in ('sale', 'disposal') then
    update public.items set status = 'archived'
    where id = p_item_id and user_id = v_user_id and status in ('owned', 'borrowed');
  else
    raise exception 'unsupported transition type: %', p_type using errcode = '22023';
  end if;

  if not found then
    raise exception 'item not found or not in a state that allows %', p_type using errcode = 'P0002';
  end if;

  insert into public.item_events (user_id, item_id, type, occurred_on, title, amount_yen, note)
  values (v_user_id, p_item_id, p_type, p_occurred_on, p_title, p_amount_yen, coalesce(p_note, ''))
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke execute on function public.record_item_transition(uuid, public.item_event_type, date, text, bigint, text) from public, anon;
grant execute on function public.record_item_transition(uuid, public.item_event_type, date, text, bigint, text) to authenticated;
