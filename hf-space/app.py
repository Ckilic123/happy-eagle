import os
from fastapi import FastAPI, Request, HTTPException, Response
from rembg import remove, new_session

app = FastAPI()

# Optional shared secret so randoms can't use your compute. Set BG_TOKEN as a
# Space secret; the Supabase function sends it in the x-token header.
TOKEN = os.environ.get("BG_TOKEN", "")

session = new_session("u2net")


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/remove")
async def remove_bg(request: Request):
    if TOKEN and request.headers.get("x-token") != TOKEN:
        raise HTTPException(status_code=401, detail="bad token")
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="no image")
    # rembg returns PNG bytes with a transparent background (the cutout).
    cutout = remove(data, session=session)
    return Response(content=cutout, media_type="image/png")
