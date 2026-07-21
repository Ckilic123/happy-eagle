import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, ScrollView, View } from 'react-native';

import { type Item, listItems } from '@/lib/items';
import { suggestOutfit } from '@/lib/suggest';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, radius, space } from '@/ui/theme';

const CATEGORY_ORDER = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] as const;
const LABEL: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
};

type Outfit = { items: Item[]; why: string; tip: string };

export default function OutfitBuilder() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [styling, setStyling] = useState(false);
  const [outfit, setOutfit] = useState<Outfit | null>(null);

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

  const groups = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: items.filter((i) => i.category === c),
  })).filter((g) => g.items.length > 0);

  async function onStyleMe() {
    setStyling(true);
    try {
      const s = await suggestOutfit();
      const chosen = s.item_ids
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is Item => !!i);
      if (chosen.length === 0) {
        Alert.alert('Hmm', 'Could not put a look together yet — try adding a few more items.');
        return;
      }
      setOutfit({ items: chosen, why: s.reasoning, tip: s.styling_tip });
    } catch (e) {
      Alert.alert('Could not style an outfit', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setStyling(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => (outfit ? setOutfit(null) : router.back())} hitSlop={12}>
          <Text variant="label" style={{ color: colors.muted }}>
            ‹ Back
          </Text>
        </Pressable>
        <Text variant="title">{outfit ? 'Your outfit' : 'Build an outfit'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
            Add some clothes first — then spin them into outfits here.
          </Text>
        </View>
      ) : outfit ? (
        // ── Styled: only the chosen pieces ──────────────────────────────
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: space.lg, paddingBottom: space.xl }}
          >
            <View style={styles.note}>
              <Text variant="body">{outfit.why}</Text>
              <Text variant="caption">{outfit.tip}</Text>
            </View>
            {outfit.items.map((item) => (
              <OutfitPiece key={item.id} item={item} />
            ))}
          </ScrollView>
          <View style={{ paddingTop: space.md, gap: space.sm }}>
            <Button label={styling ? 'Styling…' : 'Style me again'} onPress={onStyleMe} disabled={styling} />
            <Button label="Back to browsing" variant="secondary" onPress={() => setOutfit(null)} />
          </View>
        </>
      ) : (
        // ── Browse: swipeable reels ─────────────────────────────────────
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xl, paddingBottom: space.xl }}
          >
            {groups.map((g) => (
              <Reel key={g.category} label={LABEL[g.category]} items={g.items} />
            ))}
          </ScrollView>
          <View style={{ paddingTop: space.md }}>
            <Button label={styling ? 'Styling…' : 'Style me'} onPress={onStyleMe} disabled={styling} />
          </View>
        </>
      )}
    </Screen>
  );
}

const GAP = 12;

/** A single chosen garment in the styled view — large card + label. */
function OutfitPiece({ item }: { item: Item }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.card, { aspectRatio: 3 / 4 }, item.hasCutout && { padding: space.lg }]}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ flex: 1 }}
            contentFit={item.hasCutout ? 'contain' : 'cover'}
            transition={150}
          />
        ) : null}
      </View>
      <Text variant="label">{item.name ?? 'Item'}</Text>
      {item.primary_color ? <Text variant="caption">{item.primary_color}</Text> : null}
    </View>
  );
}

/** One category's swipeable reel (browse mode). */
function Reel({ label, items }: { label: string; items: Item[] }) {
  const cardWidth = Math.round(Dimensions.get('window').width * 0.6);
  const cardHeight = Math.round(cardWidth * (4 / 3));
  const [index, setIndex] = useState(0);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.reelHeader}>
        <Text variant="caption">{label}</Text>
        <Text variant="caption">
          {index + 1}/{items.length}
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)))
        }
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { width: cardWidth, height: cardHeight },
              item.hasCutout && { padding: space.md },
            ]}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ flex: 1 }}
                contentFit={item.hasCutout ? 'contain' : 'cover'}
                transition={150}
              />
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: space.lg,
  },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  reelHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden' as const,
  },
  note: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
  },
};
