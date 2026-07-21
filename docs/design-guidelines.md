# Design Guidelines

The visual + voice system for Pumpkin. Concrete enough to build a theme file from.

## North star

**Quiet, editorial, premium-minimal** — Trade Republic's restraint (lots of whitespace, high
contrast, confident type, almost no chrome) meets the prototype's **warm stone** palette. The app
should feel calm and considered, not busy or "appy." The clothes are the colour; the UI stays
neutral so the wardrobe stands out.

Principles:
- **Restraint over decoration.** Remove before you add. Hairlines, not boxes. Space, not dividers.
- **One thing per screen.** Big, obvious primary action; everything else recedes.
- **Warm neutrals.** Never cold grey. Off-white and ink, with a single warm accent used sparingly.
- **The garment is the hero.** Cutouts on a consistent neutral tile; generous padding around them.
- **Avoid AI-slop aesthetics** — no Inter/Roboto/system-font default, no purple gradients, no
  cookie-cutter card grids with heavy shadows.

## Colour tokens

Warm-neutral, near-monochrome. Accent appears rarely (primary CTA, active state).

| Token | Light | Use |
|---|---|---|
| `bg` | `#F5F2EC` | app background (warm stone) |
| `surface` | `#FBFAF7` | cards, item tiles |
| `ink` | `#1B1A17` | primary text, filled buttons |
| `muted` | `#6B665D` | secondary text, captions |
| `hairline` | `#E7E2D9` | borders, dividers (1px) |
| `accent` | `#B5603E` | terracotta — primary CTA, active/selected only |
| `accentSoft` | `#EFD9CD` | accent backgrounds (chips, highlights) |
| `success` | `#4E6B4A` | subtle positive (rare) |

Dark mode is a later concern; when we add it, invert to warm charcoals (not pure black), keep the
same accent.

## Typography

Editorial serif for display + a warm grotesque for UI. Both via `@expo-google-fonts`.

- **Display / headings:** **Fraunces** (optical, characterful) — screen titles, the "hero" lines.
- **Body / UI:** **Hanken Grotesk** (clean, friendly, not a cliché) — everything else.

| Style | Font | Size / Line | Weight |
|---|---|---|---|
| Display | Fraunces | 32 / 38 | 500 |
| Title | Fraunces | 22 / 28 | 500 |
| Body | Hanken Grotesk | 16 / 24 | 400 |
| Body-strong | Hanken Grotesk | 16 / 24 | 600 |
| Label | Hanken Grotesk | 14 / 20 | 500 |
| Caption | Hanken Grotesk | 12 / 16 | 500, `muted` |

Tone: tight but airy. Headlines can be a touch large and confident (Trade Republic does this).

## Spacing & shape

- **Spacing scale (4-based):** 4, 8, 12, 16, 24, 32, 48, 64. Default screen padding 24. Be generous.
- **Radii:** cards/tiles 18, buttons 14, chips full (pill). Soft, not sharp; never heavy.
- **Elevation:** prefer a `hairline` border + a very soft shadow (`y:2, blur:12, 6% ink`). No hard
  drop shadows.
- **Touch targets:** min 44×44.

## Components

- **Primary button:** `ink` fill, `surface` text, radius 14, full-width on key screens. One per view.
- **Secondary button:** ghost — `ink` text, `hairline` border, transparent fill.
- **Tag / chip:** pill, `surface` fill + `hairline` border; selected → `accentSoft` fill + `ink`
  text. Tappable to edit (the tag-review flow).
- **Item tile:** cutout centered on `surface`, 3:4 aspect, 12–16 padding around the garment, radius
  18. Name below in Label, colour in Caption.
- **Screen:** single column, 24 padding, lots of vertical breathing room; the primary action pinned
  or prominent.

## Imagery

- Every item is a **background-removed cutout** on the neutral `surface` tile — this consistency is
  what makes the grid feel like a real wardrobe, not a photo dump.
- Consistent **3:4** aspect across tiles and detail.

## Motion

Calm and quick: 150–250ms, ease-out. Subtle fades/slides on screen and tag transitions. Nothing
bouncy or attention-grabbing.

## Voice

Quiet, warm, low-pressure — a considerate stylist friend, not a hype app. (This is the voice
testers liked in the prototype.)

- **Do:** "Rediscover the wardrobe you already own." "Less shopping. More wearing." "A plain wall
  and decent daylight are all you need."
- **Don't:** exclamation-heavy hype, "Amazing!!", growth-hack nudges, emoji spam.
- Errors are gentle and helpful: "Couldn't read that one — try a plainer background?" not "Error."
- Empty states invite, not scold: "Add a few favourites to get started."

## Implementation note

Build these as a single `theme.ts` (colours, spacing, radii, type styles) and a small set of
primitives (`Button`, `Chip`, `ItemTile`, `Screen`) so every screen composes from the same tokens.
Load fonts once at app root via `@expo-google-fonts/fraunces` and `@expo-google-fonts/hanken-grotesk`.
