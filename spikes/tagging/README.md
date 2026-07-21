# Tagging accuracy spike

Throwaway measurement harness — **not app code**. Answers one question with evidence:
*can we tag real clothing accurately enough to build on?* (See
[../../docs/tagging-spike.md](../../docs/tagging-spike.md).)

It runs **Claude Haiku 4.5** (and optionally **Opus 4.8** for the ceiling, and **FashionCLIP**
as a free baseline) over a labeled dataset and prints a per-field accuracy scorecard.

## What it measures (and what it can't)

- **Objective fields** (category, subcategory, colour, pattern, seasonality, occasions) are graded
  automatically against the dataset's ground-truth labels.
- **Judgment fields** (formality, warmth, visual weight, silhouette, …) have **no** dataset ground
  truth, so they're **not** auto-scored — the harness dumps their distribution for you to eyeball.
  These are the fields FashionCLIP can't produce at all.

## Dataset

Default: **`fashion-product-images`** (`ashraq/fashion-product-images-small`) — one clean item per
image with tabular labels that map straight onto our objective fields. We originally picked
Fashionpedia, but it's a detection/segmentation set whose region-level attributes don't give clean
per-item truth, so it's kept as a documented (unimplemented) alternative. Known gap: this dataset
files jackets/sweaters under "Topwear", so `outerwear` is under-tested — add real photos later.

## Setup (uv)

```bash
cd spikes/tagging
uv venv --python 3.12
uv pip install -r requirements.txt
# add your key:
cp .env.example .env    # then edit .env  (or set ANTHROPIC_API_KEY in the environment)
```

FashionCLIP is heavier (Torch) and optional — install only when you want the baseline:

```bash
uv pip install -r requirements-fashionclip.txt
```

## Run

```bash
# offline — proves the eval logic works, no key or network:
uv run run.py --selftest

# wiring check — one synthetic image through Claude (needs API key):
uv run run.py --smoke

# the real thing:
uv run run.py --n 50 --models claude-haiku
uv run run.py --n 50 --models claude-haiku,fashionclip
uv run run.py --n 15 --models claude-opus          # accuracy-ceiling slice
```

Raw predictions are written to `results.json` for inspection.

## Files

| File | Role |
|---|---|
| `schema.py` | The `IndexCard` (Claude structured-output contract) + field/grading metadata |
| `data.py` | Dataset loaders → normalized ground-truth `Sample`s (+ offline mock set) |
| `tag_claude.py` | Cataloguer — Claude vision → `IndexCard` |
| `tag_fashionclip.py` | FashionCLIP zero-shot baseline (objective fields only) |
| `evaluate.py` | Per-field comparators + scorecard |
| `run.py` | CLI orchestrator |
