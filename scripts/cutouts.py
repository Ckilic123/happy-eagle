"""Background-removal worker — turns wardrobe photos into transparent cutouts.

Runs on GitHub Actions (free compute). Finds items that have an original photo
but no cutout yet, runs rembg (U^2-Net) over them, uploads the transparent PNG
to Supabase Storage and points the item row at it.

Env (GitHub secrets):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   # service role: bypasses RLS so the worker can see all rows
"""

import io
import os
import sys

from PIL import Image
from rembg import new_session, remove
from supabase import create_client

BUCKET = "wardrobe"
BATCH = 25  # keep each run short
MARGIN = 0.02  # breathing room around the garment, as a fraction of its size


def trim(png: bytes) -> bytes:
    """Crop a cutout down to the garment itself.

    rembg returns the *original* frame with the background made transparent, so the
    garment sits at an arbitrary size and offset inside a 3:4 rectangle. Layouts that
    place garments on a body need the image to *be* the garment, so trim to the alpha
    bounding box. Without this every piece floats at a random scale.
    """
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    box = im.getbbox()  # None when fully transparent (segmentation found nothing)
    if not box:
        return png
    left, top, right, bottom = box
    mx = round((right - left) * MARGIN)
    my = round((bottom - top) * MARGIN)
    im = im.crop(
        (
            max(0, left - mx),
            max(0, top - my),
            min(im.width, right + mx),
            min(im.height, bottom + my),
        )
    )
    out = io.BytesIO()
    im.save(out, format="PNG", optimize=True)
    return out.getvalue()


def main() -> int:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    sb = create_client(url, key)

    # REPROCESS=1 re-cuts items that already have a cutout (e.g. after changing how
    # cutouts are produced). The original photo is never touched, so this is safe to
    # repeat; the new PNG upserts over the old path.
    reprocess = os.environ.get("REPROCESS") == "1"
    q = sb.table("items").select("id, user_id, image_original")
    q = q.not_.is_("image_cutout", "null") if reprocess else q.is_("image_cutout", "null")
    rows = q.limit(BATCH).execute().data or []
    pending = [r for r in rows if r.get("image_original")]
    if not pending:
        print("Nothing to do — every item already has a cutout.")
        return 0

    print(f"Processing {len(pending)} item(s)...")
    session = new_session("u2net")
    done = 0

    for row in pending:
        item_id = row["id"]
        try:
            original = sb.storage.from_(BUCKET).download(row["image_original"])
            cutout = trim(remove(original, session=session))  # transparent PNG, garment-tight

            path = f"{row['user_id']}/cutout-{item_id}.png"
            sb.storage.from_(BUCKET).upload(
                path,
                cutout,
                {"content-type": "image/png", "upsert": "true"},
            )
            sb.table("items").update({"image_cutout": path}).eq("id", item_id).execute()
            done += 1
            print(f"  ✓ {item_id}")
        except Exception as exc:  # keep going; one bad photo shouldn't stop the batch
            print(f"  ✗ {item_id}: {exc}", file=sys.stderr)

    print(f"Done. {done}/{len(pending)} cutouts created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
