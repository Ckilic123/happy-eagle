// Background removal — produces a transparent cutout of the garment (remove.bg-style)
// using the free RMBG-1.4 model via transformers.js, entirely on Supabase infra.
// SPIKE: image models are heavy; this may exceed Edge Function limits. If so we
// move to a free Hugging Face Space instead.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AutoModel, AutoProcessor, RawImage } from 'npm:@huggingface/transformers@3.0.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const BUCKET = 'wardrobe';

// Load the model once per warm instance (first cold start downloads ~44MB).
// deno-lint-ignore no-explicit-any
let cache: Promise<[any, any]> | null = null;
function getModel() {
  cache ??= Promise.all([
    AutoModel.from_pretrained('briaai/RMBG-1.4'),
    AutoProcessor.from_pretrained('briaai/RMBG-1.4'),
  ]);
  return cache;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);
    const { itemId } = await req.json().catch(() => ({}));
    if (!itemId) return json({ error: 'itemId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('id, user_id, image_original')
      .eq('id', itemId)
      .single();
    if (itemErr || !item?.image_original) return json({ error: 'Item/image not found' }, 404);

    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(item.image_original);
    if (dlErr || !blob) return json({ error: 'Could not download image' }, 500);

    // Segment the garment and apply the mask as an alpha channel.
    const [model, processor] = await getModel();
    const image = await RawImage.fromBlob(blob);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(
      image.width,
      image.height,
    );
    image.putAlpha(mask);
    const outBlob = await image.toBlob('image/png');
    const bytes = new Uint8Array(await outBlob.arrayBuffer());

    const cutoutPath = `${item.user_id}/cutout-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(cutoutPath, bytes, { contentType: 'image/png', upsert: true });
    if (upErr) return json({ error: upErr.message }, 500);

    const { error: updErr } = await supabase
      .from('items')
      .update({ image_cutout: cutoutPath, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ image_cutout: cutoutPath });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
