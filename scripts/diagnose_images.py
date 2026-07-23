"""Report what wardrobe images actually contain — no eyeballing required.

Orientation bugs are invisible from the outside: the same photo can look upright
in one viewer and sideways in another depending on whether an EXIF rotation flag
is honoured. This prints the facts that decide it, so a fix can be aimed rather
than guessed at.

Reads only; never writes. Prints metadata (sizes, flags), never image content.

Env (GitHub secrets):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import io
import os
import sys

from PIL import Image, ImageOps
from supabase import create_client

BUCKET = "wardrobe"
LIMIT = 8  # newest few items is plenty to see the pattern

EXIF_ORIENTATION_TAG = 274  # standard EXIF tag number for orientation
ORIENTATION_MEANING = {
    1: "normal (no rotation needed)",
    3: "rotated 180",
    6: "rotated 90 CW  <- phone held one way",
    8: "rotated 90 CCW <- phone held the other way",
}


def describe(label: str, blob: bytes) -> None:
    im = Image.open(io.BytesIO(blob))
    w, h = im.size
    shape = "landscape" if w > h else "portrait" if h > w else "square"

    flag = None
    try:
        exif = im.getexif()
        flag = exif.get(EXIF_ORIENTATION_TAG) if exif else None
    except Exception:  # a missing or malformed EXIF block is not an error here
        flag = None

    print(f"    {label}: {w}x{h} ({shape}), format={im.format}")
    if flag is None:
        print(f"      EXIF orientation: NONE — every viewer shows these pixels as-is")
    else:
        print(f"      EXIF orientation: {flag} = {ORIENTATION_MEANING.get(flag, 'unusual value')}")
        # What the pixels become once the flag is applied, which is what Claude and
        # most photo viewers see — and what the cutout worker now bakes in.
        fixed = ImageOps.exif_transpose(im)
        print(f"      after applying the flag: {fixed.size[0]}x{fixed.size[1]}")


def main() -> int:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    sb = create_client(url, key)
    rows = (
        sb.table("items")
        .select("id, name, rotation, image_original, image_cutout, updated_at")
        .order("created_at", desc=True)
        .limit(LIMIT)
        .execute()
        .data
        or []
    )
    if not rows:
        print("No items found.")
        return 0

    print(f"Inspecting the {len(rows)} newest item(s).\n")
    for row in rows:
        print(f"- {row.get('name') or 'unnamed'}  (rotation column = {row.get('rotation')})")
        for label, path in (("original", row.get("image_original")), ("cutout", row.get("image_cutout"))):
            if not path:
                print(f"    {label}: none yet")
                continue
            try:
                describe(label, sb.storage.from_(BUCKET).download(path))
            except Exception as exc:
                print(f"    {label}: could not read — {exc}")
        print()

    print(
        "Reading this: if 'original' shows an EXIF orientation of 6 or 8 while the\n"
        "cutout is the transposed size, the straightening worked. If the cutout has\n"
        "the same orientation as the raw original, it did not."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
