# Pumpkin — background-removal Space (free)

A tiny FastAPI service on a free Hugging Face **Docker** Space that turns a photo into a
transparent PNG cutout with `rembg`. The Supabase `remove-bg` function calls it. $0.

## Deploy (one-time)

1. Create a free account at https://huggingface.co
2. New Space → **Create new Space**:
   - Owner: you · Space name: e.g. `pumpkin-bg`
   - SDK: **Docker** → **Blank**
   - Visibility: **Public** (private Spaces sleep harder on the free tier)
3. In the Space → **Files** → add these three files (copy from this folder):
   `Dockerfile`, `app.py`, `requirements.txt`
4. Space → **Settings → Variables and secrets** → add a **secret** `BG_TOKEN` = any long random
   string (this keeps strangers from using your compute). Remember it — Supabase needs the same value.
5. The Space builds automatically (~5–10 min). When the status is **Running**, note its URL:
   `https://<you>-pumpkin-bg.hf.space`
6. Test: open `https://<you>-pumpkin-bg.hf.space/` → should show `{"status":"ok"}`.

## Then (Supabase side — separate step)

Set the URL + token as Supabase secrets and redeploy the `remove-bg` function (it becomes a tiny
proxy to this Space):

```
npx supabase secrets set BG_URL=https://<you>-pumpkin-bg.hf.space BG_TOKEN=<same token> --project-ref hepxrdrvjwnuqjorwodx
npx supabase functions deploy remove-bg --project-ref hepxrdrvjwnuqjorwodx
```

Note: free Spaces **sleep after ~48h idle**; the first request after that takes ~30–60s to wake.
