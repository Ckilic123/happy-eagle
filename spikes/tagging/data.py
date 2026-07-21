"""Dataset loaders -> normalized ground-truth Samples.

A Sample carries a PIL image plus a `truth` dict expressed in OUR schema, but
only for the fields the dataset actually labels. Judgment fields (formality,
warmth, ...) are absent from these datasets by design.

Default dataset: `fashion-product-images` (ashraq/fashion-product-images-small)
— one clean item per image with tabular labels (masterCategory / subCategory /
articleType / baseColour / season / usage) that map directly onto our objective
fields.

BUILD NOTE: we originally picked Fashionpedia. On building this out, Fashionpedia
turned out to be a detection/segmentation dataset whose attributes are attached
to image *regions*, not to a single clean garment — so producing per-item ground
truth from it is fiddly. Fashion Product Images is a much cleaner fit for the
objective-field eval, so it's the default. Fashionpedia is kept as a documented
(currently unimplemented) alternative. Known gap of Fashion Product Images: it
files jackets/sweaters under "Topwear", so `outerwear` is under-represented.
"""
from __future__ import annotations

from dataclasses import dataclass

from PIL import Image


@dataclass
class Sample:
    id: str
    image: Image.Image
    truth: dict  # our-schema fields the dataset labels (objective only)


# --- normalization maps: dataset label -> our enum -------------------------

_MASTER_TO_CATEGORY = {
    "Footwear": "shoes",
    "Accessories": "accessory",
}
_SUB_TO_CATEGORY = {
    "Topwear": "top",
    "Bottomwear": "bottom",
    "Dress": "dress",
    "Shoes": "shoes",
    "Sandal": "shoes",
    "Flip Flops": "shoes",
    "Innerwear": "top",
    "Loungewear and Nightwear": "top",
    "Saree": "dress",
}
_USAGE_TO_OCCASIONS = {
    "Casual": ["casual"],
    "Formal": ["work", "formal"],
    "Sports": ["active"],
    "Ethnic": ["formal"],
    "Party": ["going-out"],
    "Travel": ["casual"],
    "Smart Casual": ["work", "casual"],
}
_SEASON_MAP = {
    "Summer": "summer",
    "Winter": "winter",
    "Spring": "spring-autumn",
    "Fall": "spring-autumn",
}


def _map_fashion_product_row(row) -> dict | None:
    sub = row.get("subCategory")
    master = row.get("masterCategory")
    category = _SUB_TO_CATEGORY.get(sub) or _MASTER_TO_CATEGORY.get(master)
    if category is None:
        return None  # skip rows we can't confidently place
    truth: dict = {"category": category}
    if row.get("articleType"):
        truth["subcategory"] = str(row["articleType"]).lower()
    if row.get("baseColour"):
        truth["primary_color"] = str(row["baseColour"]).lower()
    if row.get("season") in _SEASON_MAP:
        truth["seasonality"] = _SEASON_MAP[row["season"]]
    if row.get("usage") in _USAGE_TO_OCCASIONS:
        truth["occasions"] = _USAGE_TO_OCCASIONS[row["usage"]]
    return truth


def load_fashion_product_images(n: int) -> list[Sample]:
    from datasets import load_dataset  # lazy import (heavy)

    ds = load_dataset(
        "ashraq/fashion-product-images-small", split="train", streaming=True
    )
    out: list[Sample] = []
    for i, row in enumerate(ds):
        if len(out) >= n:
            break
        truth = _map_fashion_product_row(row)
        if not truth:
            continue
        img = row.get("image")
        if not isinstance(img, Image.Image):
            continue
        out.append(Sample(id=str(row.get("id", i)), image=img.convert("RGB"), truth=truth))
    return out


def load_fashionpedia(n: int) -> list[Sample]:
    """Best-effort Fashionpedia loader — see module BUILD NOTE. Not implemented:
    its region-level attributes don't give clean per-item truth. Use
    --dataset fashion-product-images for the objective-field eval."""
    raise NotImplementedError(
        "Fashionpedia mapping is non-trivial (segmentation/region attributes). "
        "Use --dataset fashion-product-images."
    )


def load_samples(n: int, dataset: str) -> list[Sample]:
    if dataset == "fashion-product-images":
        return load_fashion_product_images(n)
    if dataset == "fashionpedia":
        return load_fashionpedia(n)
    raise ValueError(f"unknown dataset: {dataset}")


# --- offline self-test data (no network, no API key) -----------------------

def mock_samples() -> list[Sample]:
    """Tiny synthetic set to exercise the eval logic offline."""

    def solid(color):
        return Image.new("RGB", (64, 64), color)

    return [
        Sample("m1", solid((20, 20, 40)), {
            "category": "top", "subcategory": "blouse", "primary_color": "navy",
            "pattern": "striped", "seasonality": "all-season",
            "occasions": ["work", "casual"]}),
        Sample("m2", solid((10, 10, 10)), {
            "category": "bottom", "subcategory": "trousers", "primary_color": "black",
            "pattern": "solid", "seasonality": "all-season", "occasions": ["work"]}),
        Sample("m3", solid((200, 120, 40)), {
            "category": "bottom", "subcategory": "cargo pants", "primary_color": "orange",
            "pattern": "solid", "seasonality": "summer", "occasions": ["casual"]}),
    ]
