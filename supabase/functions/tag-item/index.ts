// Cataloguer — tags one wardrobe item with Claude (vision + structured output).
// Deployed to Supabase Edge Functions. The Claude key lives here as a secret,
// never in the app. Acts as the calling user (their JWT) so RLS applies.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM =
  `You are a wardrobe cataloguer. Given one photo of a single clothing item, ` +
  `output its attributes as structured fields.\n` +
  `Definitions:\n` +
  `- formality 1-5: 1=loungewear/gym, 3=smart-casual, 5=black-tie.\n` +
  `- warmth 1-5: 1=hot-weather, 3=mild, 5=heavy winter.\n` +
  `- is_neutral: true if the colour goes with anything (black/white/navy/grey/beige/denim).\n` +
  `- visual_weight: neutral | versatile | statement (statement = draws the eye).\n` +
  `- silhouette: slim | regular | loose | oversized | tailored.\n` +
  `- layer_role: base | mid | outer.\n` +
  `- occasions: any of work, casual, going-out, active, formal.\n` +
  `The garment's TOP is the collar on a shirt, the waistband on trousers or a skirt, ` +
  `the shoulders on a dress or coat, the ankle opening on a shoe, the handle on a bag. ` +
  `Its BOTTOM is the opposite end: hem, cuffs, sole, base.\n` +
  `- orientation_note: one short sentence locating both ends in the frame, e.g. ` +
  `"collar near the left edge, hem near the right edge". Describe what you see; do ` +
  `not assume the garment is upright.\n` +
  `- top_edge: which edge of the photo the garment's TOP lies nearest — top, right, ` +
  `bottom or left. Must agree with orientation_note. Judge the garment, not the shape ` +
  `of the photo: a wide photo of an upright shirt still has top_edge 'top'.\n` +
  `Use plain-English colours (e.g. 'navy'). Output only the fields.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    category: { type: 'string', enum: ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] },
    subcategory: { type: 'string' },
    primary_color: { type: 'string' },
    secondary_colors: { type: 'array', items: { type: 'string' } },
    is_neutral: { type: 'boolean' },
    pattern: { type: 'string', enum: ['solid', 'striped', 'checked', 'floral', 'printed', 'graphic', 'other'] },
    material: { type: 'string' },
    formality: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    warmth: { type: 'integer', enum: [1, 2, 3, 4, 5] },
    seasonality: { type: 'string', enum: ['all-season', 'summer', 'winter', 'spring-autumn'] },
    silhouette: { type: 'string', enum: ['slim', 'regular', 'loose', 'oversized', 'tailored'] },
    visual_weight: { type: 'string', enum: ['neutral', 'versatile', 'statement'] },
    layer_role: { type: 'string', enum: ['base', 'mid', 'outer'] },
    occasions: { type: 'array', items: { type: 'string' } },
    // Order matters: the note is generated before top_edge, so the model has to
    // locate the collar in words before committing to an answer.
    orientation_note: { type: 'string' },
    top_edge: { type: 'string', enum: ['top', 'right', 'bottom', 'left'] },
  },
  required: [
    'name', 'category', 'subcategory', 'primary_color', 'secondary_colors', 'is_neutral',
    'pattern', 'material', 'formality', 'warmth', 'seasonality', 'silhouette',
    'visual_weight', 'layer_role', 'occasions', 'orientation_note', 'top_edge',
  ],
};

/**
 * Which edge the garment's top lies nearest → degrees to turn the photo clockwise.
 *
 * Asking for the rotation directly invited a sign flip: the model saw the garment
 * was sideways and still picked the wrong way round. Asking where the collar *is*
 * is a plain observation; the arithmetic belongs here, written down once.
 * Clockwise carries left→top (90) and right→top (270), not the other way about.
 */
const ROTATION_FOR: Record<string, number> = { top: 0, left: 90, bottom: 180, right: 270 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const { itemId } = await req.json().catch(() => ({}));
    if (!itemId) return json({ error: 'itemId required' }, 400);

    // Act as the calling user — RLS scopes every read/write to them.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('id, image_original, image_cutout')
      .eq('id', itemId)
      .single();
    if (itemErr || !item) return json({ error: 'Item not found' }, 404);

    const path = item.image_cutout ?? item.image_original;
    if (!path) return json({ error: 'Item has no image' }, 400);

    const { data: blob, error: dlErr } = await supabase.storage.from('wardrobe').download(path);
    if (dlErr || !blob) return json({ error: 'Could not download image' }, 500);
    const base64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Tag this clothing item.' },
          ],
        },
      ],
      // deno-lint-ignore no-explicit-any
    } as any);

    // deno-lint-ignore no-explicit-any
    const textBlock = (msg.content as any[]).find((b) => b.type === 'text');
    if (!textBlock) return json({ error: 'No tags returned' }, 502);
    // Both are prompt-only fields — the row stores degrees.
    const { orientation_note, top_edge, ...tags } = JSON.parse(textBlock.text);
    const rotation = ROTATION_FOR[top_edge] ?? 0;

    const { error: upErr } = await supabase
      .from('items')
      .update({ ...tags, rotation, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (upErr) return json({ error: upErr.message }, 500);

    // Echo the reasoning so a wrong turn can be diagnosed without re-running.
    return json({ tags: { ...tags, rotation }, orientation: { orientation_note, top_edge } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
