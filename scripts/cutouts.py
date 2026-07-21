"""Background-removal worker — turns wardrobe photos into transparent cutouts.

Runs on GitHub Actions (free compute). Finds items that have an original photo
but no cutout yet, runs rembg (U^2-Net) over them, uploads the transparent PNG
to Supabase Storage and points the item row at it.

Env (GitHub secrets):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   # service role: bypasses RLS so the worker can see all rows
"""

import os
import sys

from rembg import new_session, remove
from supabase import create_client

BUCKET = "wardrobe"
BATCH = 25  # keep each run short


def main() -> int:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    sb = create_client(url, key)

    rows = (
        sb.table("items")
        .select("id, user_id, image_original")
        .is_("image_cutout", "null")
        .limit(BATCH)
        .execute()
        .data
        or []
    )
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
            cutout = remove(original, session=session)  # PNG bytes, transparent bg

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
