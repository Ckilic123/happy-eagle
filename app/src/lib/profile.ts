import { supabase } from './supabase';

export type Onboarding = {
  style_vibes: string[];
  dress_for: string[];
  adventurousness: 'safe' | 'mix' | 'surprise';
};

/** Write the onboarding answers to the current user's profile row and mark it done. */
export async function saveOnboarding(answers: Onboarding): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No session — cannot save onboarding.');

  const { error } = await supabase
    .from('profiles')
    .update({
      style_vibes: answers.style_vibes,
      dress_for: answers.dress_for,
      adventurousness: answers.adventurousness,
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw error;
}
