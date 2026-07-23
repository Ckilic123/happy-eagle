# Pumpkin — the wardrobe-first redesign

Supersedes the flow in [user-journey.md](user-journey.md). The visual language
([design-guidelines.md](design-guidelines.md)) is unchanged — it works.

Fallback for everything described here as "current": branch `fallback/v1-working`,
tag `v1-working`.

## The shift in one line

From **"press a button, receive an outfit"** to **"play with the clothes I own."**

The current app is a vending machine: the wardrobe is a passive list, and one button
produces one answer. The thing people actually want is to poke at their own clothes and
see what happens. So the wardrobe stops being a list and becomes the interface.

## Three decisions, and why

**1. Onboarding is deleted.** Not shortened — deleted. People cannot self-describe style
(almost everyone picks "classic" and "relaxed"), so the answers were noise. The honest
signal is already in the wardrobe: formality spread, colour spread, how much outerwear
exists. Taste gets derived, not asked. The one genuinely useful answer —
adventurousness — was never a fixed trait anyway; it's a mood, so it moves to the outfit
screen as a control you can nudge per look.

**2. Colour becomes a first-class citizen.** The stated goal is imagining how colours
already owned work together, and nothing in the app currently shows colour as colour.
Every garment's real colours get extracted from its cutout (free, we already have the
pixels), which unlocks the palette view, the colour story on each look, and honest
"what's missing" advice.

**3. No virtual try-on.** Live AI try-on needs a GPU per user; one-shot generated try-on
is ~$0.04 an image, slow, and fails badly on crumpled-on-the-bed photos — and a failed
try-on is worse than none. The wow goes into composition and colour, which cost nothing
and never render something uncanny.

---

## Screen map

```
  first run ──▶ Wardrobe (home) ─┬─▶ Item sheet ──▶ Outfit (seeded)
                                 ├─▶ Outfit (any)
                                 ├─▶ Looks
                                 └─▶ Palette
```

Five surfaces. No tab bar — chrome costs attention, and at this size the header
carries it.

---

## 1. First run

Replaces both the old welcome screen *and* the three onboarding questions. One screen,
one action, no questions.

```
┌───────────────────────────────┐
│                               │
│                               │
│                               │
│  Rediscover the wardrobe      │  display, ~38% down —
│  you already own.             │  NOT pinned to the bottom
│                               │
│  Photograph a few pieces.     │  body, muted
│  I'll catalogue them and      │
│  start putting looks          │
│  together.                    │
│                               │
│                               │
│                               │
│                               │
│  ┌─────────────────────────┐  │
│  │  Add your first pieces  │  │  primary
│  └─────────────────────────┘  │
└───────────────────────────────┘
```

**Fixes:** the current welcome leaves ~70% of the screen empty with the headline jammed
against the bottom, which reads as unfinished rather than minimal.

**Taps:** `Add your first pieces` → system photo picker → upload → Wardrobe.
**Shown when:** zero items. Never again once anything exists — no gate for returning users.

---

## 2. Wardrobe — the home screen

```
┌───────────────────────────────┐
│ Your wardrobe      Looks  ◐   │  ◐ = palette
│ 24 pieces                     │
│                               │
│ (All)(Tops)(Bottoms)(Shoes)…  │  ← scrolls horizontally
│                               │
│ ┌─────────┐   ┌─────────┐     │
│ │         │   │         │     │  tap → item sheet
│ │         │   │         │     │  long-press → select mode
│ └─────────┘   └─────────┘     │
│ Cotton tee    Straight jeans  │
│ cream         indigo          │
│                               │
│ ┌─────────┐   ┌─────────┐     │
│ │         │   │         │     │
│ └─────────┘   └─────────┘     │
│ …                             │
│                               │
│ ┌─────────────────────────┐   │
│ │       Style me          │   │  PRIMARY (was secondary)
│ └─────────────────────────┘   │
│ ┌─────────────────────────┐   │
│ │       Add items         │   │  secondary
│ └─────────────────────────┘   │
└───────────────────────────────┘
```

**Fixes:** "Build an outfit" — the app's entire promise — was a *secondary* button below
the fold. The headline feature must be the primary action. Also: tiles were dead to the
touch, which on a screen made of photographs is the single most confusing thing about it.

**Taps**

| Element | Action |
|---|---|
| Tile | Item sheet (§3) |
| Tile long-press | Select mode (multi-select → Rotate / Remove) — unchanged, it works |
| Category chip | Filters the grid; `All` clears |
| `Looks` | Saved looks (§5) |
| `◐` | Palette (§6) |
| `Style me` | Outfit, unseeded (§4) |
| `Add items` | Photo picker |

**States:** loading (spinner) · empty (→ §1) · filtered-empty ("No shoes yet.") · adding
(button shows `Uploading…` → `Tagging 2 of 5…`).

---

## 3. Item sheet — tap a garment

A bottom sheet over the wardrobe, ~88% height, drag or tap-outside to dismiss. A sheet
rather than a pushed screen so the wardrobe stays visible behind it — you're inspecting a
thing, not going somewhere.

```
┌───────────────────────────────┐
│            ═════              │  drag handle
│                               │
│      ┌─────────────┐          │
│      │             │          │  garment, contain
│      │             │          │
│      └─────────────┘          │
│                               │
│  Cotton tee                   │  title, tap to rename
│  top · cream                  │  caption
│  ███ ███ ███                  │  its real colours
│                               │
│  ─────────────────────────    │
│  Category      top       ›    │  tap a row → chips appear inline
│  Formality     ●●●○○     ›    │  dots are tappable directly
│  Warmth        ●●○○○     ›    │
│  Wear it for   work, casual › │
│  ─────────────────────────    │
│                               │
│  ┌─────────────────────────┐  │
│  │  What goes with this?   │  │  PRIMARY — the core loop
│  └─────────────────────────┘  │
│  ┌───────────┐ ┌───────────┐  │
│  │  Rotate ↻ │ │  Remove   │  │  secondary · danger
│  └───────────┘ └───────────┘  │
└───────────────────────────────┘
```

**Why editable tags matter:** the Stylist picks outfits *entirely* from these tags and
never sees the photo. One wrong `formality: 5` silently poisons every future suggestion,
and today there is no way to see that, let alone fix it. This is the difference between
an app you trust and one you stop believing.

**Editing interaction:** tapping a row expands chips inline underneath it — no modal, no
separate edit mode, no Save button. Each change writes immediately and the row collapses.
Editable: name, category, formality, warmth, occasions. The rest stay read-only (rarely
wrong, low impact on suggestions).

---

## 4. Outfit

```
┌───────────────────────────────┐
│ ‹ Back          Your look     │
│                               │
│      ┌─────────────┐          │
│      │   figure    │          │
│      │  wearing    │          │
│      │  the look   │          │
│      └─────────────┘          │
│                               │
│  ███████ █████ ███            │  colour story, proportional
│  Warm neutrals, one rust      │
│                               │
│  Soft and easy — the rust     │  why it works
│  lifts the cream without      │
│  fighting it.                 │
│                               │
│  Cotton tee · Jeans · Sneakers│  each taps → item sheet
│                               │
│  safe ──────●────── surprise  │  mood; releasing re-rolls
│                               │
│  ┌─────────────────────────┐  │
│  │   ♥  Save this look     │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │      Try another        │  │
│  └─────────────────────────┘  │
└───────────────────────────────┘
```

**Seeded vs not:** arriving from an item sheet pins that garment — the header reads
*"Styled around your cotton tee"* and the Stylist is told it must be included. Arriving
from `Style me` is unseeded.

**The mood slider** replaces the deleted onboarding question, in the place where it's
actually useful: mid-decision, per look, changeable.

**Colour story** is the visible answer to "how do my colours work together" — swatches
pulled from the actual garments, sized by how much of the outfit each colour occupies.

**States:** styling (skeleton, not a spinner — a spinner on a full-screen wait feels
broken) · no complete outfit possible ("Add a pair of shoes and I can finish this look.")
· saved (heart fills, button → `Saved`).

---

## 5. Looks — saved outfits

```
┌───────────────────────────────┐
│ ‹ Back            Looks       │
│                               │
│ ┌───────────┐ ┌───────────┐   │
│ │  figure   │ │  figure   │   │  tap → that outfit
│ │  ███ ██   │ │  ███ ██   │   │  swatch strip under each
│ └───────────┘ └───────────┘   │
│ Tuesday       Dinner          │
│                               │
└───────────────────────────────┘
```

Empty: *"Save a look you like and it'll live here."*

---

## 6. Palette — your wardrobe as colour

The feature nobody else does well, and the direct answer to the original goal.

```
┌───────────────────────────────┐
│ ‹ Back          Your palette  │
│                               │
│ ████████████████░░░░░░░░      │  every garment, sorted by hue
│                               │
│ You lean cool and neutral.    │  derived, not asked
│ 9 of 24 pieces are blue.      │
│                               │
│ Neutral   ████████████  12    │
│ Blue      █████████      9    │
│ Warm      ██             2    │
│ Bold      █              1    │
│                               │
│ ───────── Worth adding ────── │
│                               │
│ A rust or camel piece would   │  the gap suggestion
│ give you a warm anchor — it   │
│ pairs with 11 things you      │
│ already own.                  │
│                               │
│ Your work looks skew casual.  │
│ One navy blazer would unlock  │
│ 11 new work outfits.          │
└───────────────────────────────┘
```

**On gaps:** the honest version of shopping advice — *one* purchase that multiplies what
you own, never a feed. It's nearly free to compute (text call over existing tags) and it's
the thing that separates this from both closet apps and shopping apps.

---

## Cost

Per Haiku 4.5 at $1/M in, $5/M out:

| Action | Cost | Per $1 |
|---|---|---|
| Tag one garment (vision) | ~$0.004 | ~250 items |
| One outfit suggestion | ~$0.004 | ~250 looks |
| Colour extraction | $0 | local pixels |
| Palette / gaps | ~$0.002 | ~500 |

A $5 ceiling covers roughly 1,000 items tagged and 1,000 looks — the architecture is
already within budget. The only thing that would break it is image generation, which is
why there isn't any.

---

## Build order

Each step leaves the app working.

1. **Item sheet** — tap-to-open, editable tags, seeded styling. Highest value, no
   dependencies, closes the Phase 1 gap.
2. **Delete onboarding** — first-run screen, no gate for returning users.
3. **Wardrobe home** — filter chips, `Style me` promoted to primary.
4. **Colour extraction** — worker + migration. Needs one reprocess run.
5. **Colour story + palette**.
6. **Mood slider + saved looks**.
7. **Gaps**.
