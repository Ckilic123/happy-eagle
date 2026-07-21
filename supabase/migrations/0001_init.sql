-- Pumpkin — Phase 1 schema (profiles + items) + RLS + storage.
-- Source of truth: docs/data-model.md. Paste into Supabase → SQL Editor → Run.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- outfits / wear_log come in a later migration (Phase 2+).

-- ── profiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  style_vibes     text[] default '{}',   -- Q1: classic | relaxed | bold | polished
  dress_for       text[] default '{}',   -- Q2: work | casual | going-out | active
  adventurousness text default 'mix'     -- Q3
                  check (adventurousness in ('safe','mix','surprise')),
  colors_love     text[] default '{}',
  colors_avoid    text[] default '{}',
  onboarded       boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- If profiles already existed from an earlier run, add the new column:
alter table public.profiles add column if not exists onboarded boolean default false;

-- ── items (the index card) ────────────────────────────────────────────────
create table if not exists public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  -- Identity (from photo)
  name             text,
  category         text check (category in
                     ('top','bottom','dress','outerwear','shoes','accessory')),
  subcategory      text,
  primary_color    text,
  secondary_colors text[] default '{}',
  is_neutral       boolean,
  pattern          text check (pattern in
                     ('solid','striped','checked','floral','printed','graphic','other')),
  material         text,

  -- Judgment (reasoning fields)
  formality        int  check (formality between 1 and 5),
  warmth           int  check (warmth between 1 and 5),
  seasonality      text check (seasonality in
                     ('all-season','summer','winter','spring-autumn')),
  silhouette       text check (silhouette in
                     ('slim','regular','loose','oversized','tailored')),
  visual_weight    text check (visual_weight in ('neutral','versatile','statement')),
  layer_role       text check (layer_role in ('base','mid','outer')),
  occasions        text[] default '{}',

  -- Practical
  image_original   text,   -- storage path
  image_cutout     text,
  available        boolean default true,
  brand            text,
  size             text,
  note             text,

  -- Learned later (usage)
  times_worn       int default 0,
  last_worn        date,
  loved            boolean default false,
  hidden           boolean default false,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists items_user_id_idx on public.items(user_id);

-- ── Row Level Security: you only ever touch your own rows ──────────────────
alter table public.profiles enable row level security;
alter table public.items    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-create a profile row when a user (incl. anonymous) signs up ───────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage: private per-user wardrobe bucket ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

drop policy if exists "own wardrobe folder" on storage.objects;
create policy "own wardrobe folder" on storage.objects
  for all using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
