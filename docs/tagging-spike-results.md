# Tagging Spike — Results (2026-07-17)

First real run of the [tagging spike](tagging-spike.md). Dataset:
`ashraq/fashion-product-images-small`. Harness: `spikes/tagging/`.

## Scores

**Claude Haiku 4.5 vs FashionCLIP — same 50 images:**

| Field | Haiku | FashionCLIP |
|---|---|---|
| category | **92%** (46/50) | 80% (40/50) |
| occasions | **90%** (45/50) | — (not produced) |
| subcategory | 40% (20/50) | — |
| primary_color | 62% (31/50) | 76% (38/50) |
| seasonality | 14% (7/50) | — |

**Opus 4.8 ceiling — 15 images:** category 100%, subcategory 53%, primary_color 67%,
seasonality 20%, occasions 93%. Modest lift over Haiku at ~5× cost.

**Judgment fields (no ground truth — eyeballed, Haiku n=50):** formality spread 1:15 2:14 3:11
4:9 5:1; warmth skews low (1:33 2:13 3:4); visual_weight neutral/versatile/statement mix;
silhouette mostly "regular"; materials believable (leather, cotton, denim, stainless steel).
All plausible.

## Interpretation

- **Category & occasions are solved.** Haiku 92% / 90%, Opus 100% / 93%. Both beat FashionCLIP on
  category; FashionCLIP produces neither occasions nor any judgment field.
- **subcategory (40–53%) is understated** — driven by wording mismatches (Claude "t-shirt" vs the
  dataset's "Tshirts"/"Shirts") over ~140 granular article types, not by the model misreading the
  garment. A coarser target or better matcher would raise this.
- **colour (Haiku 62% < FashionCLIP 76%) is a MEASUREMENT artifact, not a model gap.** The dataset
  has ~46 hyper-specific colours ("Navy Blue", "Turquoise Blue", "Mushroom Brown"); Claude emits
  plain-English colours ("navy", "blue") that don't string-match. FashionCLIP scores higher only
  because it's constrained to a 13-colour palette that collapses onto the coarse buckets. The
  colour comparator in `evaluate.py` is too thin to trust this number.
- **seasonality (14–20% for everyone) is a GROUND-TRUTH problem.** The dataset's `season` is the
  *retail/marketing* season, not the garment's warmth-season (a plain t-shirt is labelled "Fall").
  Useless as ground truth for us.

## Verdict — GO with Claude for tagging

- Claude nails the load-bearing fields, produces every field FashionCLIP can't, and **Haiku is
  close to Opus at ~1/5 the cost** → Haiku is the working default; reserve Opus for fields Haiku
  proves weak on after the eval fixes below.
- **FashionCLIP is not worth adding to the product** — its only edge is a colour number that is
  itself an artifact, and it yields none of the rich fields. (It stays in the harness as a baseline.)

## Follow-ups before a "final" accuracy number

1. **Fix the colour comparator** — normalize to a canonical palette (map "Navy Blue"→navy,
   "Turquoise Blue"→blue, etc.) on both sides before matching.
2. **Drop dataset `season` from grading** — derive `seasonality` from `warmth` instead, or find a
   better-labelled source. Don't chase the retail-season number.
3. **Coarsen subcategory grading** or add a synonym map for article types.
4. **Add token-usage logging** to the Claude tagger to report real per-item cost (currently
   unmeasured — order-of-magnitude pennies for the ~65 calls run today).
5. **Real phone photos** — the domain-gap check from [tagging-spike.md](tagging-spike.md) §3
   (catalog images are clean; real users shoot on a bed in bad light).

## Reproduce

```bash
cd spikes/tagging      # venv on Python 3.12, key in .env
.venv\Scripts\python run.py --n 50 --models claude-haiku,fashionclip
.venv\Scripts\python run.py --n 15 --models claude-opus
```
