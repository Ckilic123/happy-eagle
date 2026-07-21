# Outfit Builder ("roulette") + Image Treatment

Cem's product direction (2026-07-17), captured for the design. Complements
[user-journey.md](user-journey.md) and [suggestion-spike.md](suggestion-spike.md).

## The roulette — the outfit-building surface

A **different screen from the wardrobe grid**:
- **Grid** = "my wardrobe" — browse/manage everything you own.
- **Roulette** = "build an outfit" — one **horizontal reel per category** (tops / bottoms /
  dresses / outerwear / shoes / accessories), each spun independently like a slot-machine reel.
  Spin each reel to assemble a look; the selected item from each reel forms the current outfit.

Why it fits Pumpkin:
- The `category` tag on each item (from the Cataloguer) groups items into reels **for free**.
- It's the natural canvas for the **Stylist**: the AI **pre-spins the reels** to a suggested
  outfit (seed-based "find matches", weather, occasion), and the user spins to tweak. One surface
  serves both manual mixing and AI suggestions.
- Tactile and delightful — matches the calm, premium feel.

Interaction notes (for build):
- Horizontal, snap-to-item paged reels (one per non-empty category), vertically stacked.
- A "shuffle" affordance (spin all) and per-reel spin.
- Reels are populated from the wardrobe filtered by `category`; later filtered by
  weather (`warmth`) / occasion (`occasions`) / adventurousness.
- "Save this look" → the `outfits` table (Phase 2).

## Image treatment

Clothes are the hero, so images must look consistent across a reel.

- **Background removal + auto-crop = YES, together.** On-device subject segmentation yields a mask
  → use it for both the cutout *and* a tight crop box around the garment. Result: clean cutout on a
  neutral tile, cropped to the item, consistent aspect. Also improves tag accuracy (tag the clean
  cutout, not the raw photo).
  - Needs an **EAS development build** (native segmentation module; Expo Go can't load it). Also
    the natural home for the camera.
- **Wrinkle / imperfection removal = DEFER.** That's *generative* image editing (AI redraws the
  garment) — high cost/complexity for marginal polish. A clean cutout already reads as tidy. Revisit
  later as an optional "clean up" action, never a blocker.

## Decisions (2026-07-17)

- **Background removal: FREE, server-side** (chosen over on-device). On-device would need an iPhone
  **EAS dev build → Apple Developer account $99/yr** — deferred until nearer launch.
- **Free server-side = self-host a model on a free ML host** (best fit: a Hugging Face Space running
  `rembg` / RMBG-1.4). It's real infra + cold-start slowness (30–60s after idle); it can NOT run in a
  Supabase Edge Function (CPU-time limits too low for image models). So it's a mini-project, treated
  as **polish**, not a blocker.
- **Wrinkle removal: parked** — no free generative option exists; a clean cutout already looks tidy.
- **Meanwhile the roulette uses tight square crops** on a neutral tile (in-app, no infra) — already
  consistent/tidy; the cutout swaps in later.

## Sequencing (to confirm)

1. **Roulette outfit-builder** with cropped raw photos (category reels from the `category` tag).
2. **Stylist wiring** — AI pre-spins the reels (the Phase 2 "suggestions" work, surfaced in the
   roulette).
3. **Free bg-removal service** (HF Space) as a polish pass, swapping cutouts in for the crops.
