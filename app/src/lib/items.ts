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
};

const BUCKET = 'wardrobe';

/** Center-crop rectangle for a target aspect (width / height). */
function centerCropRect(w: number, h: number, aspect: number) {
  if (w / h > aspect) {
    const cw = Math.round(h * aspect);
    return { originX: Math.round((w - cw) / 2), originY: 0, width: cw, height: h };
  }
  const ch = Math.round(w / aspect);
  return { originX: 0, originY: Math.round((h - ch) / 2), width: w, height: ch };
}

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
    .select('id, name, category, primary_color, image_original, image_cutout')
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
    };
  });
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
    // 1) Normalise orientation + resize down (re-encoding bakes in rotation).
    const resized = await ImageManipulator.manipulate(asset.uri).resize({ width: 1024 }).renderAsync();
    const base = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    // 2) Auto centre-crop to a consistent 3:4 portrait frame (trims background).
    const rect = centerCropRect(base.width, base.height, 3 / 4);
    const cropped = await ImageManipulator.manipulate(base.uri).crop(rect).renderAsync();
    const final = await cropped.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
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
