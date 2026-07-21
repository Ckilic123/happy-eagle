# Suggestion Spike — the "Stylist" (2nd Claude call)

**Goal:** turn a stack of index cards + the user's onboarding answers into outfit suggestions
*with reasoning* — the part testers actually liked in the prototype. Prove it feels as good as the
prototype's hand-curated combos, before building it in.

**Status:** design only. Companion to [tagging-spike.md](tagging-spike.md) and
[user-journey.md](user-journey.md). Runs *after* tagging works (it depends on the index cards).

**Key property:** the Stylist reads **text only** (index cards), never images. So it's fast,
cheap, and the wardrobe can be a **cached prompt prefix**.

---

## 1. Two modes

| Mode | Trigger | v1? |
|---|---|---|
| **Find matches** | User taps an item → "find matches" | ✅ build first (matches the prototype users liked) |
| **Outfit of the day** | Home screen, no seed item, driven by weather + occasion | later (Phase 4/5) |

Same call, same output — "outfit of the day" just omits the seed item and always includes weather.

---

## 2. What goes in (the request)

- **Seed item** (find-matches mode) — the index card of the tapped item.
- **Wardrobe** — every item's index card as JSON (tags only, no images). This is the **cached** part.
- **Preferences** — the onboarding answers: style vibe, what they dress for, safe↔surprise, colours.
- **Context** (optional) — weather (temp/conditions from Open-Meteo), occasion (work/date/gym…).

---

## 3. What comes out (structured output)

Locked with `output_config.format` so the app can render it and validate it. Shape mirrors the
prototype's `outfitsBySeed`:

```
outfits: [
  {
    itemIds: string[]        // items from THIS wardrobe that form the outfit
    reasoning: string        // why it works (the bit users liked)
    stylingTip: string       // how to wear it — "tuck the blouse, roll the cuffs"
    accessoryHint: string?   // optional — "a tan belt would pull it together"
    confidence: 1–5          // how strong the match is
  },
  ... (2–4 outfits)
]
```

---

## 4. How the Stylist reasons (the styling rules)

These go in the cached system prompt so the model applies them consistently. Each maps to a field
on the index card:

- **Formality** — items in an outfit should sit within ~1 level of each other (don't pair gym
  shorts, formality 1, with a blazer, formality 5).
- **Warmth vs weather** — in OOTD mode, filter/prefer items whose `warmth` suits today's temp.
- **isNeutral** — neutrals go with anything; build around them. Colours need a deliberate pairing.
- **visualWeight** — **at most one `statement` piece per outfit**; everything else neutral/versatile.
- **silhouette** — balance proportions (loose top ↔ slimmer bottom, and vice-versa).
- **layerRole** — combine base + mid + outer for layered looks when it's cold.
- **occasions** — only suggest items whose `occasions` include the requested one.
- **The safe↔surprise lever (onboarding Q3):**
  - *Keep it safe* → neutrals, matching formality, tried-and-true pairings.
  - *Mix it up* → allow one colour or one statement piece.
  - *Surprise me* → an unexpected pairing (a bolder colour combo, a pattern mix) — but still coherent.
- **Style vibe (Q1)** sets the tone of the `reasoning`/`stylingTip` language and nudges choices.

---

## 5. Prompt design + caching

- **System (cached):** the Stylist persona + the rules above + the output schema + 1–2 worked
  examples. Stable across every request → cached, ~10% cost on reads.
- **User (varies):** the wardrobe JSON + seed item + preferences + weather/occasion.
- Because the wardrobe is the big, stable chunk, put it early and cache it; only the seed/context
  change between requests within a session.
- **Model:** start on `claude-haiku-4-5`; compare against `claude-opus-4-8` for suggestion *quality*
  (this is reasoning, not vision — Opus may matter more here than it does for tagging).

---

## 6. Guardrails

- **No invented garments** — validate every returned `itemId` exists in the wardrobe; drop any
  outfit that references an unknown id.
- **Don't reuse the seed's slot** — a "find matches" outfit must include the seed and fill the
  *other* slots (don't suggest two tops).
- **Small wardrobe** — if there aren't enough items to complete an outfit, say so gracefully
  ("add a bottom to unlock more looks") instead of forcing a bad combo.
- **No duplicates** — don't return the same outfit twice.
- **Availability** — skip items marked `available: false` (in the wash) in OOTD mode.

---

## 7. How we measure "good" (the hard part)

Unlike tagging, "good outfit" is subjective — so we measure two ways:

**A. Objective coherence (auto-checkable, target ≥ 90% pass):**
- all item ids exist; formality spread ≤ ~1; at most one statement piece; warmth suits weather (OOTD);
  occasion respected; no duplicate/incomplete outfits.

**B. Taste check (human, small sample):**
- Cem rates ~30 suggestions "would I wear this?" thumbs up/down. Bar = the prototype's hand-curated
  suggestions (the ones testers liked) — the AI should feel *at least as good*.
- Sanity-check the **safe↔surprise lever actually moves output** (safe looks visibly safer).

Pass = high objective coherence **and** taste on par with the prototype bar. If Haiku's taste lags,
test Opus before adding prompt complexity.

---

## 8. Cost

Text-only, wardrobe cached. A suggestion request is a few thousand cached tokens + a small output —
**a fraction of a cent**, and cheaper still on repeat requests within a session. Confirmed with real
token counts during the spike.

---

## 9. Decisions (2026-07-17)

1. **v1 = "find matches" only** (seed-based, like the prototype). "Outfit of the day" + weather
   comes later (Phase 4/5).
2. **3 outfits per request** — enough variety without choice overload.
3. **Safe↔surprise: onboarding default + on-screen toggle** — set once at signup, overridable
   per request ("show me something bolder") on the suggestions screen.
