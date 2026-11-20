-- Item lifecycle timeline: purchase, use, maintenance, modification, notes, and
-- (from the wishlist/transaction work) sale and disposal records.
-- Owner isolation: every row carries user_id, RLS limits access to the owner, and
-- the composite foreign key guarantees an event can only reference the owner's item.

create type public.item_event_type as enum (
  'purchase',
  'sale',
  'disposal',
  'maintenance',
  'use',
  'modification',
  'note'
);

alter table public.items
  add constraint items_id_user_id_key unique (id, user_id);

create table public.item_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null,
  type public.item_event_type not null,
  occurred_on date not null default current_date,
  title text not null check (char_length(trim(title)) between 1 and 160),
  note text not null default '' check (char_length(note) <= 5000),
  amount_yen bigint check (amount_yen between 0 and 1000000000000),
  usage_reading numeric(14, 2) check (usage_reading >= 0),
  next_due_on date,
  next_due_usage numeric(14, 2) check (next_due_usage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_events_item_owner_fkey
    foreign key (item_id, user_id) references public.items (id, user_id) on delete cascade,
  constraint item_events_next_due_only_for_maintenance check (
    type = 'maintenance' or (next_due_on is null and next_due_usage is null)
  )
);

create index item_events_user_item_date_idx on public.item_events (user_id, item_id, occurred_on desc, created_at desc);
create index item_events_user_type_date_idx on public.item_events (user_id, type, occurred_on desc);

create trigger item_events_set_updated_at
before update on public.item_events
for each row execute function public.set_updated_at();

alter table public.item_events enable row level security;

create policy "Users can view their own item events"
on public.item_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own item events"
on public.item_events for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own item events"
on public.item_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own item events"
on public.item_events for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.item_events to authenticated;
