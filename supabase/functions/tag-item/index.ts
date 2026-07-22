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
  `- rotation: degrees the photo must be turned CLOCKWISE for the garment to stand ` +
  `upright — collar/waistband at the top, hem at the bottom. 0 if already upright, ` +
  `90 if the garment currently points right, 270 if it points left, 180 if upside down. ` +
  `Judge by the garment, not the frame: a shoe photographed from the side is upright.\n` +
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
    rotation: { type: 'integer', enum: [0, 90, 180, 270] },
  },
  required: [
    'name', 'category', 'subcategory', 'primary_color', 'secondary_colors', 'is_neutral',
    'pattern', 'material', 'formality', 'warmth', 'seasonality', 'silhouette',
    'visual_weight', 'layer_role', 'occasions', 'rotation',
  ],
};

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
    const tags = JSON.parse(textBlock.text);

    const { error: upErr } = await supabase
      .from('items')
      .update({ ...tags, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ tags });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
