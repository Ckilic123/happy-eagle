"""Index-card schema (single source of truth) + eval/field metadata.

The Pydantic model IS the Claude structured-output contract and mirrors the
`items` table in docs/data-model.md and docs/tagging-spike.md §2.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Category = Literal["top", "bottom", "dress", "outerwear", "shoes", "accessory"]
Pattern = Literal["solid", "striped", "checked", "floral", "printed", "graphic", "other"]
Seasonality = Literal["all-season", "summer", "winter", "spring-autumn"]
Silhouette = Literal["slim", "regular", "loose", "oversized", "tailored"]
VisualWeight = Literal["neutral", "versatile", "statement"]
LayerRole = Literal["base", "mid", "outer"]
Scale = Literal[1, 2, 3, 4, 5]


class IndexCard(BaseModel):
    """One garment's tags. Enums keep the structured output valid by construction."""

    name: str
    category: Category
    subcategory: str
    primary_color: str
    secondary_colors: list[str]
    is_neutral: bool
    pattern: Pattern
    material: str
    formality: Scale
    warmth: Scale
    seasonality: Seasonality
    silhouette: Silhouette
    visual_weight: VisualWeight
    layer_role: LayerRole
    occasions: list[str]


# How each field is graded when the dataset provides ground truth for it.
#   exact -> normalized string equality
#   fuzzy -> token overlap / containment (subcategory wording varies a lot)
#   color -> color-aware match (synonyms + containment)
#   set   -> overlap between two lists
GRADEABLE: dict[str, str] = {
    "category": "exact",
    "subcategory": "fuzzy",
    "primary_color": "color",
    "pattern": "exact",
    "seasonality": "exact",
    "occasions": "set",
}

# Judgment fields have NO dataset ground truth. We collect them for human review
# (distribution dump), never auto-score them. This is the honest boundary of the
# spike: objective fields are measured, judgment fields are eyeballed.
JUDGMENT_FIELDS: list[str] = [
    "formality",
    "warmth",
    "visual_weight",
    "silhouette",
    "is_neutral",
    "layer_role",
    "material",
    "secondary_colors",
]

# Candidate labels FashionCLIP can zero-shot (objective fields only).
FASHIONCLIP_LABELS: dict[str, list[str]] = {
    "category": list(Category.__args__),  # type: ignore[attr-defined]
    "pattern": ["solid", "striped", "checked", "floral", "printed", "graphic"],
    "primary_color": [
        "black", "white", "navy", "blue", "grey", "beige", "brown",
        "red", "green", "orange", "pink", "purple", "yellow",
    ],
}

NEUTRAL_COLORS = {
    "black", "white", "navy", "grey", "gray", "beige", "brown", "denim", "cream", "tan",
}
