# AI Tagging Spike — Design (not yet built)

**Goal:** Prove that automated tagging of a wardrobe photo is accurate enough to build the app on — *before* building the app. This is the biggest product risk (the prototype faked it with hardcoded tags).

**Status:** Design only. No code yet. React to this, then we build.

---

## 1. What "success" means

The spike passes if, on a held-out set of labeled clothing photos, the tagger hits a target accuracy per field:

| Field | Type | Target (first pass) |
|---|---|---|
| `category` | enum | ≥ 95% exact |
| `subcategory` | string | ≥ 80% (fuzzy/synonym-tolerant) |
| `primaryColor` | string | ≥ 90% |
| `pattern` | enum | ≥ 85% |
| `formality` | int 1–5 | ≥ 70% within ±1 |
| `warmth` | int 1–5 | ≥ 70% within ±1 |
| `material` | string | ≥ 60% |
| `seasonality` | enum | ≥ 75% |

Targets are starting guesses — we tune them once we see the first numbers. The point is: **we measure, we don't eyeball.**

---

## 2. Tag schema — the "index card" (tagging output = DB shape)

Every item is an index card. Locked via Claude **structured outputs** (`output_config.format`
with a JSON schema) so every response is valid and fills every column — no parsing/repair code.

Source markers: **📷 read from the photo · 👤 user sets/edits · 📈 learned from use (later)**

**Identity — what it is**
```
name            📷 string        auto label, e.g. "navy striped blouse"
category        📷 enum          top | bottom | dress | outerwear | shoes | accessory
subcategory     📷 string        e.g. "long-sleeve blouse", "ankle boot"
primaryColor    📷 string        plain-English, e.g. "navy"
secondaryColors 📷 string[]
isNeutral       📷 bool          go-with-anything neutral (black/white/navy/grey/beige/denim)?  ← powers most matching
pattern         📷 enum          solid | striped | checked | floral | printed | graphic | other
material        📷 string        best guess, e.g. "cotton"
```

**Judgment — the reasoning fields (what free taggers can't do)**
```
formality       📷 int 1–5       1 = loungewear … 5 = formal
warmth          📷 int 1–5       1 = hot-weather … 5 = heavy winter
seasonality     📷 enum          all-season | summer | winter | spring-autumn
silhouette      📷 enum          slim | regular | loose | oversized | tailored
visualWeight    📷 enum          neutral | versatile | statement   ← avoids stacking two loud pieces
layerRole       📷 enum          base | mid | outer                ← builds layered looks
occasions       📷👤 string[]    work | casual | going-out | active | formal
```

**Practical / housekeeping**
```
imageOriginal   📷 url
imageCutout     📷 url
available       👤📈 bool        false = in the wash → not suggested today
brand,size,note 👤 string        optional, user-entered
```

**Learned later (usage, not photo — phase in)**
```
timesWorn       📈 int
lastWorn        📈 date
loved / hidden  👤📈 bool
```

**v1 core to build first:** Identity block + `formality`/`warmth`/`seasonality` + `visualWeight`
+ `occasions`. The rest sharpen suggestions but don't change the architecture — phase them in.
`isNeutral`, `visualWeight`, `silhouette`, `layerRole` are the fields specialized taggers *don't*
give you and are central to good suggestions.

---

## 3. Ground truth — use a public dataset, don't hand-label

Measure against an existing labeled fashion dataset instead of photographing our own clothes.

**What we actually used (build discovery):** we picked **Fashionpedia** on paper, but on building
the harness it turned out to be a detection/segmentation dataset whose attributes are attached to
image *regions* — no clean per-item ground truth. We switched to **`fashion-product-images`**
(`ashraq/fashion-product-images-small`): one clean item per image with tabular labels
(masterCategory / subCategory / articleType / baseColour / season / usage) that map straight onto
our objective fields. Fashionpedia is kept as a documented, unimplemented alternative in
`spikes/tagging/data.py`. See [tagging-spike-results.md](tagging-spike-results.md).

~50–100 images, streamed. Known gap of this dataset: jackets/sweaters are filed under "Topwear",
so `outerwear` is under-tested — covered later by real phone photos.

**Caveat — domain gap:** these are clean catalog shots; real users shoot wrinkled items on a bed in bad light. Public data is fine for the *first* pass, but before launch we add ~15–20 real phone photos to confirm accuracy survives real conditions. (We map the dataset's native labels onto our schema once — a small translation table.)

---

## 4. Approach — benchmark two taggers

Run the same held-out set through both and compare per-field accuracy:

1. **Claude Haiku 4.5** (vision + structured outputs) — the product's intended tagger.
2. **FashionCLIP** (open, free) — the specialized baseline.

Why benchmark rather than assume: it proves Claude's tagging is competitive with a purpose-built model, and pinpoints which fields (likely `subcategory` / `material`) are weak. FashionCLIP won't produce `formality`/`warmth`/`material` natively, so on those fields Claude stands alone — which is itself a finding.

Also run **Opus 4.8** on a small slice to establish the accuracy *ceiling*: if Haiku matches Opus, the cheap path is validated with evidence; if not, we know exactly where the stronger model earns its cost.

---

## 5. Claude call design

- **Input:** one image (base64 or URL) + a short instruction.
- **Output:** structured output locked to the schema in §2 — guaranteed shape, valid enums.
- **Prompt caching:** the taxonomy + field definitions + a few labeled few-shot examples go in a **cached system prompt** (stable); only the image varies per call. Cache reads cost ~10% of normal input, so across a 50-item onboarding the instruction tokens are paid ~once. (Haiku's minimum cacheable prefix is ~4096 tokens — the taxonomy + examples must clear that bar; they will.)
- **Model:** `claude-haiku-4-5` primary; `claude-opus-4-8` for the ceiling slice.

### Prompt sketch (system, cached)
> You are a wardrobe cataloguer. Given one photo of a single clothing item, output its attributes. Definitions: `formality` 1–5 where 1 is loungewear and 5 is black-tie… `warmth` 1–5 where 1 is hot-weather and 5 is heavy winter… [few-shot: 3 labeled examples]. Output only the structured fields.

---

## 6. Cost sanity check (rough)

Haiku 4.5 is $1 / $5 per 1M input/output tokens. One tagging call ≈ one image (~1–2K image tokens) + a small cached instruction prefix + a tiny structured output. Ballpark **well under a cent per item** with caching — a 50-item onboarding costs pennies. Confirmed with real token counts during the spike, not assumed.

---

## 7. Deliverables of the spike

1. A per-field accuracy table: Claude Haiku vs. FashionCLIP (vs. Opus on the ceiling slice).
2. A confusion list — which categories/attributes get mistaken for which.
3. A go/no-go on Haiku for tagging, with evidence.
4. The finalized tag schema (this doc's §2, adjusted by what we learn).
5. Rough per-item cost from measured tokens.

---

## 8. Decisions (2026-07-17) — and what the spike found

1. **Ground-truth dataset: `fashion-product-images`** (switched from Fashionpedia on build — §3).
2. **Benchmarked Claude Haiku 4.5 vs FashionCLIP**, side by side, plus `claude-opus-4-8` on a
   15-image ceiling slice. **Outcome: GO with Claude** (Haiku default, ≈ Opus at ~1/5 cost);
   FashionCLIP not worth adding. Full numbers: [tagging-spike-results.md](tagging-spike-results.md).
3. **Tagging and suggestion stay two separate Claude calls** (tagging = vision per item;
   suggestion = text on stored tags). Onboarding answers feed the *suggestion* call only.
4. Before launch, add ~15–20 **real phone photos** to confirm accuracy survives messy conditions
   (the dataset is clean catalog shots — see §3 domain-gap note).
