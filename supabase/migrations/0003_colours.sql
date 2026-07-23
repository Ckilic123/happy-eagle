-- Pumpkin — a garment's real colours.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- The Cataloguer already names a colour ("navy"), but a name cannot be drawn. These
-- are the actual hex values sampled from the garment's own pixels, which is what makes
-- the palette view and the colour story on each look possible.
--
-- Stored as text[] of '#rrggbb', most-used first. Filled by the cutout worker, which
-- has the pixels in hand anyway — so this costs nothing per item.

alter table public.items
  add column if not exists colors text[] default '{}';
