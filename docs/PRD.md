# Pumpkin — PRD & Source of Truth

The entry point for building. Read this first; it points at the detailed specs and
defines what we build next and what "done" means. Keep it thin — the design docs hold the detail.

## Product in one paragraph

Pumpkin helps people **rediscover the clothes they already own**. You photograph your wardrobe
once; the app catalogues each item automatically and suggests outfits from what you have —
considering weather and occasion. Less shopping, more wearing. Target user: someone with a full
closet who still "has nothing to wear." Built as a personal tool and a portfolio project.

## Source of truth (who owns what)

| Question | Authoritative doc |
|---|---|
| What the user experiences, screen by screen + backend | [user-journey.md](user-journey.md) |
| The tag schema / "index card" (= the `items` shape) | [tagging-spike.md](tagging-spike.md) §2 |
| Does tagging actually work? (evidence) | [tagging-spike-results.md](tagging-spike-results.md) |
| How outfit suggestions work (the Stylist) | [suggestion-spike.md](suggestion-spike.md) |
| Database tables, security, storage | [data-model.md](data-model.md) |

If two docs ever disagree, the one named above for that topic wins; fix the other.

## Locked principles (don't re-litigate)

- **Two AI calls:** Cataloguer (vision, per item, once) + Stylist (text, per request). Suggestions
  run on stored tags, never images.
- **Secrets server-side:** the Claude key lives in a Supabase Edge Function; the device never holds
  it. Background removal runs **on-device** (subject segmentation — free, no key).
- **Anonymous-first:** usable from tap one; sign-up converts later, same id, silent data carry-over.
- **Batch add → review:** pick several photos, process together, confirm tags (shown, editable,
  default-accept).
- **Onboarding = 3 taps** (style vibe / what you dress for / safe↔surprise).

## Status

- ✅ Design complete (the docs above).
- ✅ **Biggest risk retired:** AI tagging validated — Haiku category 92% / occasions 90%, GO with
  Claude ([tagging-spike-results.md](tagging-spike-results.md)).
- ▶️ **Next: Phase 1 — Wardrobe core** (below).

---

## Phase 1 — Wardrobe core (the build target)

The core loop, end to end, with **real AI tagging** (validated, so folded in from the start —
supersedes the old "manual tags first" plan).

**In scope**
1. Anonymous Supabase auth on first launch.
2. Onboarding (3 taps) → `profiles` row.
3. Add items (batch): pick photos → device removes background (on-device) → Edge Function does
   Claude tagging → review screen with editable tags → "Save all" → `items` rows.
4. Wardrobe grid (cutouts + count) → tap → item detail (image + tag badges, editable).
5. Supabase foundation: `profiles` + `items` tables + RLS + `wardrobe` storage bucket + the
   tagging Edge Function (keys in secrets).
6. Runs on a real iPhone via Expo Go.

**Acceptance criteria (Phase 1 is "done" when)**
- A brand-new user can open the app (no signup), finish onboarding, and see prefs persisted.
- They can batch-pick ≥3 photos; each comes back background-removed and tagged; the review list
  lets them edit any tag; "Save all" persists them.
- The grid shows saved items with cutouts; tapping one shows its detail + tags.
- All data is per-user via RLS; images in the private bucket; no API key is in the app bundle.

**Non-goals for Phase 1** (later phases)
- Outfit suggestions / "find matches" (Phase 2).
- Weather / outfit-of-the-day (Phase 3), occasions (Phase 4).
- Account sign-up/conversion UI, wear log, saved outfits, search/filter (nice-to-have later).

## Later phases (summary — detail in the design docs)

- **Phase 2 — Suggestions:** the Stylist, seed-based "find matches", 3 outfits, safe↔surprise
  toggle. See [suggestion-spike.md](suggestion-spike.md).
- **Phase 3 — Outfit of the day + weather** (Open-Meteo).
- **Phase 4 — Occasion-based matching.**
- **Phase 5 — Polish, account conversion, App Store.**

## Known follow-ups carried from the spike

Before trusting a "final" tagging accuracy number (not blockers for Phase 1): fix the colour
comparator, derive seasonality from warmth, coarsen subcategory grading, add token-usage logging,
test real phone photos. See [tagging-spike-results.md](tagging-spike-results.md) §follow-ups.
