import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';

import { addItemsFromLibrary, type Item, listItems, tagItem } from '@/lib/items';
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">Your wardrobe</Text>
        <Text variant="caption">{items.length} items</Text>
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
          renderItem={({ item }) => <ItemTile item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={{ paddingTop: space.md, gap: space.sm }}>
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
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
};
