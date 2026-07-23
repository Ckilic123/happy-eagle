import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, View } from 'react-native';

import { type Item, listItems } from '@/lib/items';
import { type Mood, suggestOutfit } from '@/lib/suggest';
import { Button } from '@/ui/Button';
import { ColourStory } from '@/ui/ColourStory';
import { DressingRoom } from '@/ui/DressingRoom';
import { ItemSheet } from '@/ui/ItemSheet';
import { MoodControl } from '@/ui/MoodControl';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, radius, space } from '@/ui/theme';

type Outfit = { items: Item[]; why: string; tip: string };

export default function OutfitScreen() {
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [mood, setMood] = useState<Mood>('mix');
  const [styling, setStyling] = useState(true);
  const [sheetItem, setSheetItem] = useState<Item | null>(null);

  const seedItem = items.find((i) => i.id === seed) ?? null;

  const style = useCallback(
    async (nextMood: Mood, wardrobe: Item[]) => {
      setStyling(true);
      try {
        const s = await suggestOutfit({ seedId: seed, mood: nextMood });
        const chosen = s.item_ids
          .map((id) => wardrobe.find((i) => i.id === id))
          .filter((i): i is Item => !!i);
        if (chosen.length === 0) {
          Alert.alert('Hmm', 'Could not put a look together yet — try adding a few more pieces.');
          return;
        }
        setOutfit({ items: chosen, why: s.reasoning, tip: s.styling_tip });
      } catch (e) {
        Alert.alert('Could not style a look', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setStyling(false);
      }
    },
    [seed],
  );

  // Style immediately on arrival — landing on an empty screen with a button to press
  // wastes the tap the user already made to get here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wardrobe = await listItems();
        if (cancelled) return;
        setItems(wardrobe);
        await style('mix', wardrobe);
      } catch (e) {
        console.warn('load failed', e);
        setStyling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [style]);

  function onMood(next: Mood) {
    setMood(next);
    style(next, items); // changing the mood re-rolls — that is the whole point of it
  }

  const figureHeight = Math.min(Dimensions.get('window').height * 0.42, 420);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text variant="label" style={{ color: colors.muted }}>
            ‹ Back
          </Text>
        </Pressable>
        <Text variant="title">Your look</Text>
        <View style={{ width: 44 }} />
      </View>

      {seedItem ? (
        <Text variant="caption" style={{ textAlign: 'center', marginBottom: space.sm }}>
          Styled around your {seedItem.name?.toLowerCase() ?? 'piece'}
        </Text>
      ) : null}

      {styling && !outfit ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
          <Text variant="caption" style={{ marginTop: space.md }}>
            Putting a look together…
          </Text>
        </View>
      ) : !outfit ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
            Add a few more pieces and I can finish a look.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}
        >
          <View style={styling ? { opacity: 0.4 } : undefined}>
            <DressingRoom items={outfit.items.filter((i) => i.hasCutout)} height={figureHeight} />
          </View>

          {/* Naming every piece matters because an outer layer hides what's under it,
              exactly as it would in life. Each one opens its sheet, so the look is
              also a way back into the wardrobe. */}
          <View style={styles.pieces}>
            {outfit.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.piece}
                onPress={() => setSheetItem(item)}
                accessibilityRole="button"
              >
                <Text variant="label">{item.name ?? 'Item'}</Text>
              </Pressable>
            ))}
          </View>

          <ColourStory items={outfit.items} />

          <View style={styles.note}>
            <Text variant="body">{outfit.why}</Text>
            <Text variant="caption">{outfit.tip}</Text>
          </View>
        </ScrollView>
      )}

      {/* Controls stay put rather than scrolling away — changing the mood is the
          main thing you do here, so it must never be below the fold. */}
      <View style={{ paddingTop: space.md, gap: space.md }}>
        {outfit ? <MoodControl value={mood} onChange={onMood} disabled={styling} /> : null}
        <Button
          label={styling ? 'Styling…' : 'Try another'}
          onPress={() => style(mood, items)}
          disabled={styling}
          style={styling ? { opacity: 0.6 } : undefined}
        />
      </View>

      <ItemSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onChanged={async () => setItems(await listItems())}
        onStyle={(item) => router.replace(`/outfit?seed=${item.id}` as never)}
      />
    </Screen>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: space.sm,
  },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  note: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
  },
  pieces: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: space.sm,
  },
  piece: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
};
