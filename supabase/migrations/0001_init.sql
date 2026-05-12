-- Apadore Bookmarks — v1 schema
-- Run this once in the Supabase SQL editor against a fresh project.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- profiles  (mirrors auth.users; 1:1)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- categories
-- ============================================================================
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- tags
-- ============================================================================
create table if not exists public.tags (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique,
  slug  text not null unique
);

-- ============================================================================
-- pins
-- ============================================================================
do $$ begin
  create type pin_size as enum ('small', 'medium', 'wide', 'tall', 'large');
exception when duplicate_object then null; end $$;

create table if not exists public.pins (
  id            uuid primary key default uuid_generate_v4(),
  title         text,
  description   text,
  source_url    text,
  image_url     text,
  image_width   int,
  image_height  int,
  size          pin_size not null default 'medium',
  category_id   uuid references public.categories(id) on delete set null,
  saved_by      uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- a pin is meaningless without at least an image or a source link
  constraint pins_must_have_image_or_url check (image_url is not null or source_url is not null)
);

create index if not exists pins_created_at_idx on public.pins (created_at desc);
create index if not exists pins_category_idx on public.pins (category_id);
create index if not exists pins_saved_by_idx on public.pins (saved_by);

-- Full-text search column for title + description
alter table public.pins
  add column if not exists search tsvector
  generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;
create index if not exists pins_search_idx on public.pins using gin (search);

-- ============================================================================
-- pin_tags  (many-to-many)
-- ============================================================================
create table if not exists public.pin_tags (
  pin_id  uuid not null references public.pins(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (pin_id, tag_id)
);
create index if not exists pin_tags_tag_idx on public.pin_tags (tag_id);

-- ============================================================================
-- Storage bucket for uploaded images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('pin-images', 'pin-images', true)
on conflict (id) do nothing;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.tags        enable row level security;
alter table public.pins        enable row level security;
alter table public.pin_tags    enable row level security;

-- profiles: any authenticated user can read all profiles; only self can update.
drop policy if exists "profiles_select_authed" on public.profiles;
create policy "profiles_select_authed" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- categories: any authenticated user can read; any authed user can insert.
drop policy if exists "categories_select_authed" on public.categories;
create policy "categories_select_authed" on public.categories
  for select to authenticated using (true);

drop policy if exists "categories_insert_authed" on public.categories;
create policy "categories_insert_authed" on public.categories
  for insert to authenticated with check (auth.uid() = created_by);

-- tags: any authenticated user can read; any authed user can insert.
drop policy if exists "tags_select_authed" on public.tags;
create policy "tags_select_authed" on public.tags
  for select to authenticated using (true);

drop policy if exists "tags_insert_authed" on public.tags;
create policy "tags_insert_authed" on public.tags
  for insert to authenticated with check (true);

-- pins: any authenticated user can read all pins; writes restricted to author.
drop policy if exists "pins_select_authed" on public.pins;
create policy "pins_select_authed" on public.pins
  for select to authenticated using (true);

drop policy if exists "pins_insert_self" on public.pins;
create policy "pins_insert_self" on public.pins
  for insert to authenticated with check (auth.uid() = saved_by);

drop policy if exists "pins_update_self" on public.pins;
create policy "pins_update_self" on public.pins
  for update to authenticated using (auth.uid() = saved_by);

drop policy if exists "pins_delete_self" on public.pins;
create policy "pins_delete_self" on public.pins
  for delete to authenticated using (auth.uid() = saved_by);

-- pin_tags: read = any authed; write = only by pin's author.
drop policy if exists "pin_tags_select_authed" on public.pin_tags;
create policy "pin_tags_select_authed" on public.pin_tags
  for select to authenticated using (true);

drop policy if exists "pin_tags_insert_authed" on public.pin_tags;
create policy "pin_tags_insert_authed" on public.pin_tags
  for insert to authenticated with check (
    exists (select 1 from public.pins p where p.id = pin_id and p.saved_by = auth.uid())
  );

drop policy if exists "pin_tags_delete_authed" on public.pin_tags;
create policy "pin_tags_delete_authed" on public.pin_tags
  for delete to authenticated using (
    exists (select 1 from public.pins p where p.id = pin_id and p.saved_by = auth.uid())
  );

-- Storage bucket policies: any authed user can upload; anyone can read (public bucket).
drop policy if exists "pin_images_authed_upload" on storage.objects;
create policy "pin_images_authed_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'pin-images');

drop policy if exists "pin_images_authed_delete" on storage.objects;
create policy "pin_images_authed_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'pin-images' and owner = auth.uid());
