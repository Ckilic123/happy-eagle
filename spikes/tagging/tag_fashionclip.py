"""FashionCLIP zero-shot baseline for the objective fields it can do.

Heavy deps (torch, transformers) are imported lazily so the rest of the harness
(and --selftest) runs without them. Install when you actually run this tagger:
    uv pip install -r requirements-fashionclip.txt
"""
from __future__ import annotations

from PIL import Image

from schema import FASHIONCLIP_LABELS

_MODEL_ID = "patrickjohncyh/fashion-clip"
_cache: dict = {}


def _load():
    if "model" not in _cache:
        from transformers import CLIPModel, CLIPProcessor

        _cache["model"] = CLIPModel.from_pretrained(_MODEL_ID)
        _cache["proc"] = CLIPProcessor.from_pretrained(_MODEL_ID)
    return _cache["model"], _cache["proc"]


def _classify(image: Image.Image, labels: list[str], template: str) -> str:
    import torch

    model, proc = _load()
    prompts = [template.format(label=label) for label in labels]
    inputs = proc(text=prompts, images=image, return_tensors="pt", padding=True)
    with torch.no_grad():
        out = model(**inputs)
    probs = out.logits_per_image.softmax(dim=1)[0]
    return labels[int(probs.argmax())]


def tag_image(image: Image.Image) -> dict:
    image = image.convert("RGB")
    return {
        "category": _classify(image, FASHIONCLIP_LABELS["category"], "a photo of a {label}"),
        "pattern": _classify(
            image, FASHIONCLIP_LABELS["pattern"], "a {label} patterned clothing item"),
        "primary_color": _classify(
            image, FASHIONCLIP_LABELS["primary_color"], "a {label} coloured clothing item"),
    }
