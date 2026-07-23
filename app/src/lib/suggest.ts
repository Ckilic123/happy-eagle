import { supabase } from './supabase';

export type Suggestion = {
  item_ids: string[];
  reasoning: string;
  styling_tip: string;
};

/** How adventurous this particular look should be. A mood, not a personality trait. */
export type Mood = 'safe' | 'mix' | 'surprise';

/**
 * Ask the Stylist for one outfit.
 *
 * `seedId` pins a garment the look must be built around — the "what goes with this?"
 * case, which is the difference between browsing your wardrobe and pulling a lever.
 */
export async function suggestOutfit(opts: { seedId?: string; mood?: Mood } = {}): Promise<Suggestion> {
  const { data, error } = await supabase.functions.invoke('suggest-outfit', {
    body: { seedId: opts.seedId, mood: opts.mood },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as Suggestion;
}
