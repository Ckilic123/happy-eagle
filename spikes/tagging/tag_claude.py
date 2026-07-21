"""Cataloguer — Claude vision tagging -> IndexCard via structured output.

Uses `client.messages.parse(output_format=IndexCard)` so the result is validated
against the schema. The instruction prefix is cached (cache_control) so tagging a
whole batch pays the instruction tokens ~once.
"""
from __future__ import annotations

import base64
import io

from PIL import Image

from schema import IndexCard

SYSTEM = (
    "You are a wardrobe cataloguer. Given one photo of a single clothing item, "
    "output its attributes as structured fields.\n"
    "Definitions:\n"
    "- formality 1-5: 1=loungewear/gym, 3=smart-casual, 5=black-tie.\n"
    "- warmth 1-5: 1=hot-weather, 3=mild, 5=heavy winter.\n"
    "- is_neutral: true if the colour goes with anything "
    "(black/white/navy/grey/beige/denim).\n"
    "- visual_weight: neutral | versatile | statement (statement = draws the eye).\n"
    "- silhouette: slim | regular | loose | oversized | tailored.\n"
    "- layer_role: base | mid | outer.\n"
    "- occasions: any of work, casual, going-out, active, formal.\n"
    "Use plain-English colours (e.g. 'navy'). Output only the fields."
)


def _b64_jpeg(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=90)
    return base64.standard_b64encode(buf.getvalue()).decode("utf-8")


def tag_image(client, image: Image.Image, model: str) -> dict:
    resp = client.messages.parse(
        model=model,
        max_tokens=1024,
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64", "media_type": "image/jpeg", "data": _b64_jpeg(image)}},
                {"type": "text", "text": "Tag this clothing item."},
            ],
        }],
        output_format=IndexCard,
    )
    card = resp.parsed_output
    return card.model_dump() if card else {}
