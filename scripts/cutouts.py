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

from PIL import Image, ImageOps
from rembg import new_session, remove
from supabase import create_client

BUCKET = "wardrobe"
BATCH = 25  # keep each run short
MARGIN = 0.02  # breathing room around the garment, as a fraction of its size


def trim(im: Image.Image) -> bytes:
    """Crop a cutout down to the garment itself.

    rembg returns the *original* frame with the background made transparent, so the
    garment sits at an arbitrary size and offset inside a rectangle. Layouts that
    place garments on a body need the image to *be* the garment, so trim to the alpha
    bounding box. Without this every piece floats at a random scale.
    """
    im = im.convert("RGBA")
    box = im.getbbox()  # None when fully transparent (segmentation found nothing)
    if not box:
        out = io.BytesIO()
        im.save(out, format="PNG")
        return out.getvalue()
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

    # REPROCESS=1 re-cuts *every* item, whether or not it already has a cutout — the
    # "redo everything" button after changing how cutouts are made. It deliberately
    # does not exclude already-cut items: a run that skipped the newest photo because
    # it had not been cut yet is the opposite of what "redo everything" should mean.
    # Originals are never touched, so this is safe to repeat; each PNG upserts.
    reprocess = os.environ.get("REPROCESS") == "1"
    q = sb.table("items").select("id, user_id, image_original")
    if not reprocess:
        q = q.is_("image_cutout", "null")
    rows = q.limit(BATCH).execute().data or []
    pending = [r for r in rows if r.get("image_original")]
    if not pending:
        print("Nothing to do — no items need a cutout.")
        return 0

    print(f"Processing {len(pending)} item(s)...")
    session = new_session("u2net")
    done = 0

    for row in pending:
        item_id = row["id"]
        try:
            raw = sb.storage.from_(BUCKET).download(row["image_original"])
            # Honor the phone's EXIF rotation flag by baking it into the pixels.
            # PIL (and therefore rembg) ignores that flag, so without this a photo
            # stored sideways-with-a-flag is cut out sideways — and the resulting PNG
            # can't carry the flag to correct it. Claude and most photo viewers apply
            # the flag, so this is what makes the cutout agree with them.
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
            cutout = trim(remove(img, session=session))  # transparent PNG, garment-tight, upright

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
