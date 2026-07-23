import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

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
import { ItemSheet } from '@/ui/ItemSheet';
import { ItemTile } from '@/ui/ItemTile';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

const SECTION: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
};

/** Below this many pieces the grid stays flat — see `sections` below. */
const GROUP_ABOVE = 10;

const COLUMNS = 3;

/**
 * Exact tile width, rather than a percentage.
 *
 * Percentages plus fixed gaps overflow by a point or two and silently drop the last
 * tile to the next row — the grid looks like two columns and nothing says why.
 * Measuring the row and dividing it can't drift.
 */
function useCellWidth() {
  const { width } = useWindowDimensions();
  const content = width - space.xl * 2; // Screen's horizontal padding
  return (content - space.md * (COLUMNS - 1)) / COLUMNS;
}

export default function Wardrobe() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetItem, setSheetItem] = useState<Item | null>(null);
  const cellWidth = useCellWidth();

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

  /**
   * Grouped rather than filtered.
   *
   * A row of category buttons was chrome sitting on top of the clothes, on the one
   * screen where the clothes are the whole point — and it made you tap to see less.
   * Quiet headings give the same structure, show everything at once, and cost nothing
   * to read. Anything the Cataloguer hasn't tagged goes last, under its own heading,
   * so it's visible rather than scattered.
   */
  const grouped = [
    ...CATEGORIES.map((c) => ({
      key: c,
      title: SECTION[c],
      items: items.filter((i) => i.category === c),
    })),
    { key: 'untagged', title: 'Not tagged yet', items: items.filter((i) => !i.category) },
  ].filter((s) => s.items.length > 0);

  // Headings earn their place only once there is something to organise. A new
  // wardrobe with one of each would otherwise be six headings above six garments —
  // structure for its own sake, and a long scroll to see almost nothing.
  const sections = items.length >= GROUP_ABOVE ? grouped : [{ key: 'all', title: '', items }];

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
        {!adding ? (
          <Pressable onPress={selecting ? endSelecting : onAdd} hitSlop={12}>
            <Text variant="label" style={{ color: colors.accent }}>
              {selecting ? 'Done' : 'Add'}
            </Text>
          </Pressable>
        ) : (
          <Text variant="caption">{status}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: space.xl, paddingBottom: space.xl }}
        >
          {sections.map((section) => (
            <View key={section.key} style={{ gap: space.sm }}>
              {section.title ? <Text variant="caption">{section.title}</Text> : null}
              <View style={styles.grid}>
                {section.items.map((item) => (
                  <View key={item.id} style={{ width: cellWidth }}>
                    <ItemTile
                      item={item}
                      selecting={selecting}
                      selected={selected.has(item.id)}
                      onPress={selecting ? () => toggle(item.id) : () => setSheetItem(item)}
                      onLongPress={() => {
                        setSelecting(true);
                        toggle(item.id);
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ paddingTop: space.md, gap: space.sm }}>
        {selecting ? (
          <>
            {selected.size > 0 ? (
              <Button label="Rotate ↻" variant="secondary" onPress={onRotate} />
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
          // One action. Adding lives in the header because you do it rarely; this is
          // what the app is for.
          <Button label="Style me" onPress={() => router.push('/outfit' as Href)} />
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
    marginBottom: space.lg,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: space.sm,
  },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.md },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
};
