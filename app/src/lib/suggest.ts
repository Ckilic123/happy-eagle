import { supabase } from './supabase';

export type Suggestion = {
  item_ids: string[];
  reasoning: string;
  styling_tip: string;
};

/** Ask the Stylist Edge Function for one outfit from the wardrobe. */
export async function suggestOutfit(): Promise<Suggestion> {
  const { data, error } = await supabase.functions.invoke('suggest-outfit', { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as Suggestion;
}
