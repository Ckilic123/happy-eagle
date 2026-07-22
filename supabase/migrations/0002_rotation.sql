-- Pumpkin — upright garments.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- How far the photo must be turned CLOCKWISE for the garment to stand upright.
-- Set by the Cataloguer during tagging; the user can override it from the app.
-- Applied at display time rather than baked into the file, so a correction shows
-- up immediately and there is only ever one source of truth.

alter table public.items
  add column if not exists rotation int not null default 0;

alter table public.items
  drop constraint if exists items_rotation_check;

alter table public.items
  add constraint items_rotation_check check (rotation in (0, 90, 180, 270));
