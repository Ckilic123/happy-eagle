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
PALETTE_SIZE = 3  # how many colours to keep per garment
MIN_SHARE = 0.06  # ignore colours covering less than this much of the garment


def palette(im: Image.Image, count: int = PALETTE_SIZE) -> list[str]:
    """The garment's own colours, most-used first, as '#rrggbb'.

    Sampled from the cutout rather than the photo, so the background is already gone
    and only fabric is counted — the pixels are in hand at this point, which is why
    this costs nothing. Fully transparent pixels are dropped, and anti-aliased edge
    pixels along with them (they are blends of garment and nothing, so they invent
    colours the garment does not have).

    Quantising to a small palette and ranking by area beats averaging: a striped shirt
    should report black AND white, not the grey they average to.
    """
    small = im.convert("RGBA")
    small.thumbnail((160, 160))  # plenty for colour, far quicker to count

    opaque = [px for px in small.getdata() if px[3] > 200]
    if not opaque:
        return []

    flat = Image.new("RGB", (len(opaque), 1))
    flat.putdata([(r, g, b) for r, g, b, _ in opaque])
    quantised = flat.quantize(colors=8, method=Image.Quantize.MEDIANCUT)

    lut = quantised.getpalette() or []
    total = len(opaque)
    ranked = sorted(quantised.getcolors() or [], reverse=True)

    out: list[str] = []
    for freq, idx in ranked:
        if freq / total < MIN_SHARE:
            continue
        r, g, b = lut[idx * 3 : idx * 3 + 3]
        hex_code = f"#{r:02x}{g:02x}{b:02x}"
        if hex_code not in out:
            out.append(hex_code)
        if len(out) == count:
            break
    return out


def trim_image(im: Image.Image) -> Image.Image:
    """Crop a cutout down to the garment itself.

    rembg returns the *original* frame with the background made transparent, so the
    garment sits at an arbitrary size and offset inside a rectangle. Layouts that
    place garments on a body need the image to *be* the garment, so trim to the alpha
    bounding box. Without this every piece floats at a random scale.

    Returns an image rather than bytes so the colours can be sampled from the same
    result that gets uploaded, with no second decode.
    """
    im = im.convert("RGBA")
    box = im.getbbox()  # None when fully transparent (segmentation found nothing)
    if not box:
        return im
    left, top, right, bottom = box
    mx = round((right - left) * MARGIN)
    my = round((bottom - top) * MARGIN)
    return im.crop(
        (
            max(0, left - mx),
            max(0, top - my),
            min(im.width, right + mx),
            min(im.height, bottom + my),
        )
    )


def to_png(im: Image.Image) -> bytes:
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
            cut = trim_image(remove(img, session=session))  # transparent, garment-tight, upright
            colors = palette(cut)
            cutout = to_png(cut)

            path = f"{row['user_id']}/cutout-{item_id}.png"
            sb.storage.from_(BUCKET).upload(
                path,
                cutout,
                {"content-type": "image/png", "upsert": "true"},
            )
            sb.table("items").update(
                {"image_cutout": path, "colors": colors}
            ).eq("id", item_id).execute()
            done += 1
            print(f"  ✓ {item_id}")
        except Exception as exc:  # keep going; one bad photo shouldn't stop the batch
            print(f"  ✗ {item_id}: {exc}", file=sys.stderr)

    print(f"Done. {done}/{len(pending)} cutouts created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
