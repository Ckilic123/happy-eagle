# User Journey — UI + Backend (agreed)

The end-to-end experience for Pumpkin, with decisions locked as of 2026-07-17.
Companion to [tagging-spike.md](tagging-spike.md). Design only — nothing built yet.

**Architectural thread:** every item is tagged once (vision). Everything after — suggestions,
weather, occasion — runs on those **text tags, no images**. Vision is a one-time per-garment
cost; suggestions are cheap, fast, and cacheable. There are **two distinct Claude calls**:
tagging (vision, per item, once) and suggestion (text, per request).

**Secrets never ship in the app.** The device calls a **Supabase Edge Function** that holds the
Claude key and calls the Claude API server-side. **Background removal runs on-device** (subject
segmentation — free, private, no key), so the phone produces the cutout before upload.

---

## Stage 0 — First open & auth
- **UI:** Landing ("Rediscover the wardrobe you already own") → "Begin".
- **Backend:** **Anonymous Supabase Auth session** from the first tap — no signup wall.
  Rows are created under the anonymous `user_id`; on later signup the same `user_id` carries
  the data over **silently** (no re-import). RLS keyed to `auth.uid()` covers anon users too.
- **Signup nudge** appears at the "save / sync your wardrobe" moment, not before value is shown.

## Stage 1 — Onboarding (personalization capture)
A few quick taps — every question must change how the Stylist behaves, or it's cut. (The
prototype's 1–5 "adventurousness" slider was arbitrary; this replaces it.)

- **Q1 · "Which feels most like you?"** (pick any) — Classic & clean / Relaxed & casual /
  Bold & expressive / Polished & elegant → sets the *tone* of suggestions.
- **Q2 · "Most days, what are you dressing for?"** (pick any) — Work / Everyday casual /
  Going out / Active → which formality/occasions to favour; powers Outfit-of-the-Day.
- **Q3 · "When we suggest outfits…"** (pick one) — Keep it safe / Mix it up / Surprise me →
  the "adventurousness" lever, 3 honest choices instead of a vague 1–5.
- **Q4 (optional, skippable) · "Any colours you love or avoid?"** → light nudge; also learned
  from the wardrobe itself.
- **Backend:** Persist answers to a `profiles` row. **Unlike the prototype, this persists and
  feeds the suggestion prompt** — it's the product's edge. The app keeps learning from favourites
  and actual wear, so onboarding stays short.

## Stage 2 — Add items (batch) — the tagging flow
- **UI:** Pick/shoot a **batch (min ~3–5 to start)** → one "Identify" action → progress screen
  ("Identifying N items…") → **review list**: one card per item, cutout + pre-filled editable
  tags (chips tappable) → **"Save all"**. Tags are **shown, editable, default-accept** (Save
  works in one tap). The 3–5 minimum is an **onboarding nudge only** — single-add is allowed later.
- **Per photo:**
  1. **On device:** subject segmentation → cutout; upload original + cutout → Supabase Storage.
  2. **Edge Function** (fanned out): **Claude Haiku (vision, structured output)** on the cutout →
     tags (schema = the `items` table).
  3. Collect all results → return the batch for review.
  4. "Save all" → write all `items` rows (image URLs + tags + `user_id`).
- **Processing model:** user **waits on the progress screen** until the batch is done. To avoid
  Edge Function timeouts, process with **bounded concurrency + streamed progress**, chunking very
  large batches under the hood (invisible to the user).

## Stage 3 — Wardrobe grid
- **UI:** Grid of cutouts, item count, tap → detail. **Plus search/filter** (absent in the
  prototype; needed at 50 items).
- **Backend:** Query `items` by `user_id`; images via Storage CDN; cache locally for offline grid.

## Stage 4 — Item detail → "Find matches" (suggestion — 2nd Claude call)
- **UI:** Item detail (cutout + tag badges) → "Find matches" → outfit combinations with
  reasoning / styling tips / accessory hints (the part users praised).
- **Backend:**
  1. Fetch seed item + the wardrobe's **tags as JSON (no images)** + user prefs
     (adventurousness, favourites).
  2. One Claude call, **text-only, cacheable** (wardrobe tags as the cached prefix) → outfit combos.
  3. **Validate** every returned item ID exists in the wardrobe (guard against invented garments).

## Stage 5 — Outfit of the day + weather (Phase 4)
- **UI:** Home screen shows today's suggested outfit.
- **Backend:** Device geolocation → **Open-Meteo** → temp/conditions feed the `warmth` filter and
  the suggestion prompt. Weather cached per day/location.

## Stage 6 — Occasion (Phase 5)
- **UI:** Pick an occasion (work, date, gym…) → suggestions re-ranked.
- **Backend:** Occasion string into the suggestion prompt; the `formality` field does the work.

---

## Decisions locked (2026-07-17)
- Auth: **anonymous-first**, convert later, silent data carry-over.
- Add-item: **batch upload → process together → batch review**, min 3–5 (onboarding nudge).
- Tag trust: **show, allow edit, default-accept**.
- Big batches: **wait on a progress screen** (bounded concurrency under the hood).

## Design status / next
- Design phase complete. All spike questions closed — see [tagging-spike.md](tagging-spike.md) §8
  and [suggestion-spike.md](suggestion-spike.md) §9 for the decisions.
- Companion docs: [tagging-spike.md](tagging-spike.md), [suggestion-spike.md](suggestion-spike.md),
  [data-model.md](data-model.md).
- **Next: build the tagging accuracy spike** (standalone script, no app yet) — the go/no-go gate
  before any UI.
