import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, View } from 'react-native';

import {
  addItemsFromLibrary,
  CATEGORIES,
  deleteItems,
  type Item,
  listItems,
  rotateItems,
  tagItem,
} from '@/lib/items';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ItemSheet } from '@/ui/ItemSheet';
import { ItemTile } from '@/ui/ItemTile';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

const LABEL: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
};

export default function Wardrobe() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<Item | null>(null);

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

  // Only offer a filter for categories that actually exist — an empty "Dresses"
  // filter is a dead end the user has to discover by tapping it.
  const present = CATEGORIES.filter((c) => items.some((i) => i.category === c));
  const shownItems = filter ? items.filter((i) => i.category === filter) : items;
  const untagged = items.filter((i) => !i.category);

  async function onAdd() {
    setAdding(true);
    try {
      setStatus('Uploading…');
      const ids = await addItemsFromLibrary();
      if (ids.length) {
        await load(); // show the photos immediately, before tags land
        for (let i = 0; i < ids.length; i++) {
          setStatus(`Tagging ${i + 1} of ${ids.length}…`);
          try {
            await tagItem(ids[i]);
          } catch (e) {
            console.warn('tag failed', e); // leave it untagged rather than lose the photo
          }
        }
        await load();
      }
    } catch (e) {
      Alert.alert('Could not add photos', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setStatus(null);
      setAdding(false);
    }
  }

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

  // ── First run: one screen, one action, no questions ──────────────────────
  if (!loading && items.length === 0) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
          <Text variant="display">Rediscover the wardrobe you already own.</Text>
          <Text variant="body" style={{ color: colors.muted }}>
            Photograph a few pieces. I'll catalogue them and start putting looks together.
          </Text>
        </View>
        <Button
          label={status ?? 'Add your first pieces'}
          onPress={onAdd}
          disabled={adding}
          style={adding ? { opacity: 0.6 } : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="title">{selecting ? `${selected.size} selected` : 'Your wardrobe'}</Text>
          {!selecting && items.length > 0 ? (
            <Text variant="caption">
              {items.length} {items.length === 1 ? 'piece' : 'pieces'}
            </Text>
          ) : null}
        </View>
        {items.length > 0 && !adding ? (
          <Pressable onPress={() => (selecting ? endSelecting() : setSelecting(true))} hitSlop={12}>
            <Text variant="label" style={{ color: colors.accent }}>
              {selecting ? 'Done' : 'Select'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {present.length > 1 && !selecting ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}
        >
          <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
          {present.map((c) => (
            <Chip
              key={c}
              label={LABEL[c]}
              selected={filter === c}
              onPress={() => setFilter(filter === c ? null : c)}
            />
          ))}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : shownItems.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
            Nothing here yet.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={shownItems}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.xxxl }}
          renderItem={({ item }) => (
            <ItemTile
              item={item}
              selecting={selecting}
              selected={selected.has(item.id)}
              // Tapping opens the item; only in select mode does it tick.
              onPress={selecting ? () => toggle(item.id) : () => setSheetItem(item)}
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
            {/* The app's whole promise, so it gets the primary button. */}
            {items.length > 0 && !adding ? (
              <Button label="Style me" onPress={() => router.push('/outfit' as Href)} />
            ) : null}
            <Button
              label={status ?? 'Add items'}
              variant={items.length > 0 ? 'secondary' : 'primary'}
              onPress={onAdd}
              disabled={adding}
              style={adding ? { opacity: 0.6 } : undefined}
            />
          </>
        )}
      </View>

      <ItemSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onChanged={load}
        onStyle={(item) => router.push(`/outfit?seed=${item.id}` as Href)}
      />
    </Screen>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    marginBottom: space.md,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: space.sm,
  },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
};
