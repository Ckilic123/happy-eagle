import { supabase } from './supabase';

/**
 * The profile row still exists (auth creates it), but nothing is asked of the user any
 * more — the onboarding questionnaire was deleted.
 *
 * Why: people are poor at self-describing style, so the answers were noise. Everyone
 * picks "classic" and "relaxed". What someone actually owns is a fact, so the Stylist
 * now derives taste from the wardrobe itself (formality spread, how expressive the
 * pieces are, which occasions recur). The one useful answer — adventurousness — turned
 * out to be a mood rather than a trait, and now lives on the outfit screen where it
 * can change per look.
 *
 * The `profiles` columns are left in place: they cost nothing empty, and a future
 * sign-up flow will want somewhere to put a name.
 */
export async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
