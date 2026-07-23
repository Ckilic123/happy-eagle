import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export type Item = {
  id: string;
  name: string | null;
  category: string | null;
  primary_color: string | null;
  image_original: string | null;
  image_cutout: string | null;
  imageUrl: string | null; // signed URL for display
  hasCutout: boolean; // true once background removal has run
  rotation: number; // degrees clockwise to stand the garment upright (0/90/180/270)
  // Judgement fields. The Stylist picks looks from these and never sees the photo,
  // so a wrong value here quietly skews every future suggestion — which is why they
  // are editable in the item sheet.
  formality: number | null; // 1 loungewear … 5 black-tie
  warmth: number | null; // 1 hot-weather … 5 heavy winter
  occasions: string[];
  colors: string[]; // the garment's real colours, most-used first
};

/** Every category the Cataloguer can assign, in the order they're offered for editing. */
export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] as const;

/** Occasions an item can suit. Matches the Cataloguer's vocabulary. */
export const OCCASIONS = ['work', 'casual', 'going-out', 'active', 'formal'] as const;

const BUCKET = 'wardrobe';

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No session yet — try again in a moment.');
  return user.id;
}

/** The current user's items, newest first, each with a signed URL for display. */
export async function listItems(): Promise<Item[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('items')
    .select(
      'id, name, category, primary_color, image_original, image_cutout, rotation, formality, warmth, occasions, colors',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const paths = rows
    .map((r) => r.image_cutout ?? r.image_original)
    .filter((p): p is string => !!p);

  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return rows.map((r) => {
    const p = r.image_cutout ?? r.image_original;
    return {
      ...r,
      imageUrl: p ? (urlByPath.get(p) ?? null) : null,
      hasCutout: !!r.image_cutout,
      rotation: r.rotation ?? 0,
      occasions: r.occasions ?? [],
      colors: r.colors ?? [],
    };
  });
}

/**
 * Correct one item's tags.
 *
 * Writes immediately rather than collecting edits behind a Save button: each change is
 * one tap on one field, and a half-finished edit has no meaning worth preserving.
 */
export async function updateItem(
  id: string,
  patch: Partial<Pick<Item, 'name' | 'category' | 'formality' | 'warmth' | 'occasions'>>,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw error;
}

/** Turn items a quarter-turn clockwise — the manual fix when the Cataloguer guesses wrong. */
export async function rotateItems(ids: string[], items: Item[]): Promise<void> {
  if (!ids.length) return;
  const userId = await requireUserId();
  const byId = new Map(items.map((i) => [i.id, i]));
  await Promise.all(
    ids.map((id) =>
      supabase
        .from('items')
        .update({ rotation: (((byId.get(id)?.rotation ?? 0) + 90) % 360) })
        .eq('user_id', userId)
        .eq('id', id),
    ),
  );
}

/**
 * Pick photos from the library, upload them, and create item rows.
 * Returns the new item IDs (empty if cancelled). Tagging happens after, via
 * `tagItem`. NOTE: background removal is added later (needs a dev build).
 */
export async function addItemsFromLibrary(): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo access was denied.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
  });
  if (result.canceled || !result.assets?.length) return [];

  const userId = await requireUserId();
  const rows: { user_id: string; image_original: string; name: string }[] = [];

  for (let i = 0; i < result.assets.length; i++) {
    const asset = result.assets[i];
    // Normalise orientation + resize down; re-encoding bakes in the EXIF rotation.
    // Deliberately NO crop. Forcing every photo into a 3:4 portrait frame cut the
    // ends off any garment shot sideways or in landscape — irreversibly, before
    // anything else got a look at it. The cutout worker trims to the garment far
    // better, and the app fits rather than fills, so an odd aspect is harmless.
    const resized = await ImageManipulator.manipulate(asset.uri).resize({ width: 1024 }).renderAsync();
    const final = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
    if (!final.base64) continue;
    const path = `${userId}/${Date.now()}-${i}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(final.base64), { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw upErr;
    rows.push({ user_id: userId, image_original: path, name: 'New item' });
  }

  if (!rows.length) return [];
  const { data, error } = await supabase.from('items').insert(rows).select('id');
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

/**
 * Permanently delete items and their photos.
 *
 * Storage first: once the rows are gone there is nothing left pointing at the files,
 * and they'd sit in the bucket forever. A failed file removal is logged rather than
 * thrown — a leftover file is a smaller problem than an item you can't get rid of.
 */
export async function deleteItems(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('items')
    .select('image_original, image_cutout')
    .eq('user_id', userId)
    .in('id', ids);
  if (error) throw error;

  const paths = (data ?? [])
    .flatMap((r) => [r.image_original, r.image_cutout])
    .filter((p): p is string => !!p);

  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmErr) console.warn('could not remove some photos', rmErr);
  }

  const { error: delErr } = await supabase
    .from('items')
    .delete()
    .eq('user_id', userId)
    .in('id', ids);
  if (delErr) throw delErr;
}

/** Ask the tag-item Edge Function to tag one item with Claude. Updates the row in place. */
export async function tagItem(itemId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('tag-item', { body: { itemId } });
  if (error) throw error;
}
