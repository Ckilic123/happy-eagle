# Data Model — Supabase (Postgres + Storage + Auth)

The database behind the app. Turns the index card ([tagging-spike.md](tagging-spike.md) §2) and
onboarding ([user-journey.md](user-journey.md) Stage 1) into real tables. Design only — nothing
built yet.

**One rule over everything:** Row Level Security — a user can only read/write their **own** rows.
Works for anonymous users too (they get a real `auth.users` id from tap one; signing up keeps the
same id, so data carries over with no import step).

---

## Tables (mental model)

| Table | Holds | v1? |
|---|---|---|
| `profiles` | who you are — onboarding answers | ✅ |
| `items` | what you own — one row per garment (the index card) | ✅ |
| `outfits` | looks you've saved | soon (with "save outfit") |
| `wear_log` | what you wore & when — powers times/last worn | later |

---

## `profiles` — one row per user

```sql
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  style_vibes     text[] default '{}',   -- Q1: classic | relaxed | bold | polished
  dress_for       text[] default '{}',   -- Q2: work | casual | going-out | active
  adventurousness text default 'mix'     -- Q3
                  check (adventurousness in ('safe','mix','surprise')),
  colors_love     text[] default '{}',   -- Q4 (optional)
  colors_avoid    text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

Create the row automatically on signup via a trigger on `auth.users`, or on the first onboarding write.

---

## `items` — the index card

```sql
create table items (
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
  occasions        text[] default '{}',   -- work | casual | going-out | active | formal

  -- Practical
  image_original   text,                  -- storage path
  image_cutout     text,
  available        boolean default true,  -- false = in the wash → not suggested
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

create index items_user_id_idx on items(user_id);
```

Enums are `text + CHECK` (not Postgres enum types) so we can add values without a migration —
useful while the taxonomy is still settling.

---

## `outfits` — saved looks (soon)

```sql
create table outfits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_ids   uuid[] not null,           -- items that make up the look
  source     text default 'suggested'   -- suggested | manual
             check (source in ('suggested','manual')),
  reasoning  text,                       -- kept from the Stylist's suggestion
  loved      boolean default false,
  created_at timestamptz default now()
);
```

v1 suggestions are generated on the fly and shown; this table exists for when the user taps
"save this outfit."

## `wear_log` — later

```sql
create table wear_log (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  item_id  uuid not null references items(id) on delete cascade,
  worn_on  date default current_date
);
```

A row per wear → aggregate into `items.times_worn` / `last_worn`. Powers "you never wear this"
nudges and smarter suggestions.

---

## Row Level Security (the security rule)

```sql
alter table profiles enable row level security;
alter table items    enable row level security;
alter table outfits  enable row level security;
alter table wear_log enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id)      with check (auth.uid() = id);

create policy "own items" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own outfits" on outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own wear_log" on wear_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Every query is silently scoped to the logged-in user — no way to read someone else's closet.

---

## Storage (photos)

- One **private** bucket, e.g. `wardrobe`.
- Path per file: `{user_id}/{item_id}/original.jpg` and `.../cutout.png`.
- `items.image_original` / `image_cutout` store the **path**; the app fetches via signed URL.
- Storage RLS so a user only reaches their own folder:

```sql
create policy "own wardrobe folder" on storage.objects
  for all using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## How the two AI calls touch the data

- **Cataloguer (tagging)** — the device removes the background on-device, uploads original + cutout,
  then the Edge Function receives the cutout + the user's JWT → Claude → returns tags. The app writes
  the `items` rows on "Save all" (under the user's id, so RLS applies). The **Claude key** lives in
  **Edge Function secrets**, never on the device; background removal needs no key.
- **Stylist (suggestion)** — Edge Function reads the user's `items` (tags only, no images) +
  `profiles` → Claude → returns outfits. Because it queries with the user's context, RLS guarantees
  it only ever sees that user's wardrobe.

---

## Anonymous → signup

Anonymous users have a real `auth.users` id, so their `profiles`/`items` rows are already keyed
correctly. Converting to a real account (email/OAuth) **keeps the same id** → data carries over
silently, no migration.

---

## v1 build order

1. `profiles` + `items` + RLS + the `wardrobe` storage bucket.
2. `outfits` when we add "save this look."
3. `wear_log` when we add wear tracking.
