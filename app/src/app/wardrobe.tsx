import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import {
  addItemsFromLibrary,
  deleteItems,
  type Item,
  listItems,
  rotateItems,
  tagItem,
} from '@/lib/items';
import { Button } from '@/ui/Button';
import { ItemTile } from '@/ui/ItemTile';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

export default function Wardrobe() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setItems(await listItems());
    } catch (e) {
      console.warn('load items failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function endSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** Items the Cataloguer never managed to tag — the usual cleanup target. */
  const untagged = items.filter((i) => !i.category);

  async function onAdd() {
    setAdding(true);
    try {
      setStatus('Uploading…');
      const ids = await addItemsFromLibrary();
      if (ids.length) {
        await load(); // show the photos immediately (as "New item")
        for (let i = 0; i < ids.length; i++) {
          setStatus(`Tagging ${i + 1} of ${ids.length}…`);
          try {
            await tagItem(ids[i]);
          } catch (e) {
            console.warn('tag failed', e); // e.g. function not deployed yet — item stays untagged
          }
        }
        await load(); // reflect the tags
      }
    } catch (e) {
      Alert.alert('Could not add photos', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setStatus(null);
      setAdding(false);
    }
  }

  /** Quarter-turn the selection. Stays in selection mode so it can be tapped again. */
  async function onRotate() {
    try {
      await rotateItems([...selected], items);
      await load();
    } catch (e) {
      Alert.alert('Could not rotate', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function onRemove() {
    const ids = [...selected];
    if (!ids.length) return;
    Alert.alert(
      `Remove ${ids.length} ${ids.length === 1 ? 'item' : 'items'}?`,
      'This deletes the photos too, and cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItems(ids);
              endSelecting();
              await load();
            } catch (e) {
              Alert.alert('Could not remove', e instanceof Error ? e.message : 'Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="title">{selecting ? `${selected.size} selected` : 'Your wardrobe'}</Text>
          {!selecting ? <Text variant="caption">{items.length} items</Text> : null}
        </View>
        {items.length > 0 && !adding ? (
          <Pressable onPress={() => (selecting ? endSelecting() : setSelecting(true))} hitSlop={12}>
            <Text variant="label" style={{ color: colors.accent }}>
              {selecting ? 'Done' : 'Select'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
            Add a few favourites to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.xxxl }}
          renderItem={({ item }) => (
            <ItemTile
              item={item}
              selecting={selecting}
              selected={selected.has(item.id)}
              onPress={selecting ? () => toggle(item.id) : undefined}
              // Long-press is the shortcut in; "Select" is the discoverable way.
              onLongPress={() => {
                setSelecting(true);
                toggle(item.id);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={{ paddingTop: space.md, gap: space.sm }}>
        {selecting ? (
          <>
            {selected.size > 0 ? (
              <Button label="Rotate ↻" variant="secondary" onPress={onRotate} />
            ) : untagged.length > 0 ? (
              <Button
                label={`Select ${untagged.length} untagged`}
                variant="secondary"
                onPress={() => setSelected(new Set(untagged.map((i) => i.id)))}
              />
            ) : null}
            <Button
              label={selected.size ? `Remove ${selected.size}` : 'Select items to remove'}
              variant="danger"
              onPress={onRemove}
              disabled={selected.size === 0}
              style={selected.size === 0 ? { opacity: 0.5 } : undefined}
            />
          </>
        ) : (
          <>
            {items.length > 0 && !adding ? (
              <Button
                label="Build an outfit"
                variant="secondary"
                onPress={() => router.push('/outfit' as Href)}
              />
            ) : null}
            <Button
              label={status ?? 'Add items'}
              onPress={onAdd}
              disabled={adding}
              style={adding ? { opacity: 0.6 } : undefined}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    marginBottom: space.lg,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: space.sm,
  },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
};
