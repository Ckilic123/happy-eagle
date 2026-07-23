// Stylist — picks ONE complete outfit from the user's wardrobe (text-only, no images).
// Reads stored tags + onboarding prefs; returns item ids + reasoning. Claude key is a secret.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM =
  `You are a personal stylist. Given a wardrobe (items with tags) and the user's style ` +
  `preferences, choose ONE complete, wearable outfit using ONLY the items provided.\n` +
  `Rules:\n` +
  `- A complete outfit is a top + bottom, OR a dress; add outerwear / shoes / accessory from the ` +
  `wardrobe when they fit. Use what's available — small wardrobes are fine.\n` +
  `- Keep formality within ~1 level across the outfit.\n` +
  `- At most ONE 'statement' visual_weight item; the rest neutral or versatile.\n` +
  `- Neutrals pair with anything; balance silhouettes (loose with slimmer).\n` +
  `- Style is inferred from the wardrobe itself, not from stated preferences. Dress the ` +
  `person their clothes describe.\n` +
  `- adventurousness: 'safe' = neutrals + matching formality; 'mix' = allow one colour or statement; ` +
  `'surprise' = an unexpected but still coherent pairing.\n` +
  `- If asked to build around a specific item, that item MUST appear in item_ids.\n` +
  `- For item_ids, use ONLY the "ref" values from the wardrobe (e.g. "i0", "i3"). ` +
  `reasoning: one warm sentence on why it works. styling_tip: one short how-to-wear tip.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    item_ids: { type: 'array', items: { type: 'string' } },
    reasoning: { type: 'string' },
    styling_tip: { type: 'string' },
  },
  required: ['item_ids', 'reasoning', 'styling_tip'],
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    // Wardrobe — tags only, no images. RLS scopes to the caller.
    const { data: items, error } = await supabase
      .from('items')
      .select(
        'id, category, subcategory, primary_color, is_neutral, pattern, formality, warmth, visual_weight, silhouette, occasions',
      )
      .eq('hidden', false)
      .not('category', 'is', null); // untagged items have no attributes to style with
    if (error) return json({ error: error.message }, 500);
    if (!items || items.length === 0) return json({ error: 'Your wardrobe is empty.' }, 400);

    const { seedId, mood } = await req.json().catch(() => ({}));

    // Give each item a short `ref` so Claude never has to echo a long UUID
    // (models mangle those). We map refs back to the real ids afterward.
    const refItems = items.map((it, i) => ({
      ref: `i${i}`,
      category: it.category,
      subcategory: it.subcategory,
      primary_color: it.primary_color,
      is_neutral: it.is_neutral,
      pattern: it.pattern,
      formality: it.formality,
      warmth: it.warmth,
      visual_weight: it.visual_weight,
      silhouette: it.silhouette,
      occasions: it.occasions,
    }));
    const refToId = new Map(items.map((it, i) => [`i${i}`, it.id]));
    const idToRef = new Map(items.map((it, i) => [it.id, `i${i}`]));

    // Taste is read off the wardrobe rather than asked for in a questionnaire: people
    // are poor at self-describing style, but what they own is a fact. A closet of 1-2
    // formality with no outerwear says more than any answer to "which feels like you?".
    const rated = items.filter((i) => typeof i.formality === 'number');
    const avgFormality = rated.length
      ? rated.reduce((s, i) => s + (i.formality as number), 0) / rated.length
      : null;
    const statements = items.filter((i) => i.visual_weight === 'statement').length;
    const derived = {
      wardrobe_size: items.length,
      typical_formality: avgFormality ? Math.round(avgFormality * 10) / 10 : 'unknown',
      leans: statements / Math.max(items.length, 1) > 0.3 ? 'expressive' : 'understated',
      common_occasions: [...new Set(items.flatMap((i) => i.occasions ?? []))],
    };

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const seedRef = seedId ? idToRef.get(seedId) : undefined;
    const userContent =
      `Wardrobe (JSON):\n${JSON.stringify(refItems)}\n\n` +
      `What their wardrobe says about them (JSON):\n${JSON.stringify(derived)}\n\n` +
      `Adventurousness for this look: ${mood ?? 'mix'}\n\n` +
      (seedRef
        ? `REQUIRED: build the outfit around "${seedRef}". It must appear in item_ids.\n\n`
        : '') +
      `Choose one outfit.`;

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: userContent }],
      // deno-lint-ignore no-explicit-any
    } as any);

    // deno-lint-ignore no-explicit-any
    const textBlock = (msg.content as any[]).find((b) => b.type === 'text');
    if (!textBlock) return json({ error: 'No suggestion returned' }, 502);
    const suggestion = JSON.parse(textBlock.text);

    // Map refs back to real ids (accept a real id too, as a fallback). Drops invented ones.
    const validIds = new Set(items.map((i) => i.id));
    suggestion.item_ids = (suggestion.item_ids as string[])
      .map((r) => refToId.get(r) ?? (validIds.has(r) ? r : null))
      .filter((x): x is string => !!x);

    return json(suggestion);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
