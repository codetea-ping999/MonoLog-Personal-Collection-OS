create type public.item_kind as enum ('book', 'movie', 'music', 'game', 'other');
create type public.item_status as enum ('owned', 'wishlist', 'borrowed', 'archived');

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  kind public.item_kind not null default 'other',
  status public.item_status not null default 'owned',
  tags text[] not null default '{}',
  rating smallint check (rating between 0 and 5),
  note text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_updated_idx on public.items (user_id, updated_at desc);
create index items_user_kind_idx on public.items (user_id, kind);
create index items_user_status_idx on public.items (user_id, status);
create index items_tags_idx on public.items using gin (tags);
create index items_search_idx on public.items using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(note, ''))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "Users can view their own items"
on public.items for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own items"
on public.items for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
on public.items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own items"
on public.items for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'collection-images',
  'collection-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own collection images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'collection-images'
  and (storage.foldername(name))[1] = ((select auth.uid())::text)
);

create policy "Users can view their own collection images"
on storage.objects for select to authenticated
using (
  bucket_id = 'collection-images'
  and (storage.foldername(name))[1] = ((select auth.uid())::text)
);

create policy "Users can replace their own collection images"
on storage.objects for update to authenticated
using (
  bucket_id = 'collection-images'
  and (storage.foldername(name))[1] = ((select auth.uid())::text)
)
with check (
  bucket_id = 'collection-images'
  and (storage.foldername(name))[1] = ((select auth.uid())::text)
);

create policy "Users can delete their own collection images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'collection-images'
  and (storage.foldername(name))[1] = ((select auth.uid())::text)
);
