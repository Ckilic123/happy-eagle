import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FIXTURE_ITEMS, FIXTURE_SETS } from '@/lib/fixtures';
import type { Mood } from '@/lib/suggest';
import { Button } from '@/ui/Button';
import { ColourStory } from '@/ui/ColourStory';
import { DressingRoom } from '@/ui/DressingRoom';
import { ItemSheet } from '@/ui/ItemSheet';
import { ItemTile } from '@/ui/ItemTile';
import { MoodControl } from '@/ui/MoodControl';
import { Text } from '@/ui/Text';
import { colors, radius, space } from '@/ui/theme';

/**
 * Dev-only harness for reviewing screens without a phone or a populated wardrobe.
 * /preview?set=home|sheet|outfit|layered|dress|everyday
 *
 * Renders inside a fixed 390pt column so a desktop screenshot is phone-accurate, and
 * uses the real components rather than mock-ups — a harness that drifts from the app
 * is worse than none.
 */
export default function Preview() {
  const { set = 'home', h = '460' } = useLocalSearchParams<{ set?: string; h?: string }>();
  if (!__DEV__) return null;

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#55534E' }}>
      <View style={styles.phone}>
        {set === 'home' ? (
          <WardrobeHome />
        ) : set === 'sheet' ? (
          <SheetPreview />
        ) : set === 'outfit' ? (
          <OutfitPreview height={Number(h)} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <DressingRoom items={FIXTURE_SETS[set] ?? FIXTURE_SETS.layered} height={Number(h)} />
          </View>
        )}
      </View>
    </View>
  );
}

/** The wardrobe as it looks with clothes in it — grouped, not filtered. */
function WardrobeHome() {
  // A realistic wardrobe has several of each kind. Reviewing against one-of-each
  // makes the grouped layout look sparser than it ever will in use.
  const cellWidth = (390 - space.xl * 2 - space.md * 2) / 3;
  const tiles = [
    ...FIXTURE_ITEMS.slice(0, 6),
    ...FIXTURE_ITEMS.slice(0, 6).map((i) => ({ ...i, id: `${i.id}-b`, name: `${i.name} II` })),
    ...FIXTURE_ITEMS.slice(0, 3).map((i) => ({ ...i, id: `${i.id}-c`, name: `${i.name} III` })),
  ];
  const sections = [
    { key: 'top', title: 'Tops', items: tiles.filter((i) => i.category === 'top') },
    { key: 'bottom', title: 'Bottoms', items: tiles.filter((i) => i.category === 'bottom') },
    { key: 'dress', title: 'Dresses', items: tiles.filter((i) => i.category === 'dress') },
    { key: 'outerwear', title: 'Outerwear', items: tiles.filter((i) => i.category === 'outerwear') },
    { key: 'shoes', title: 'Shoes', items: tiles.filter((i) => i.category === 'shoes') },
    { key: 'accessory', title: 'Accessories', items: tiles.filter((i) => i.category === 'accessory') },
  ].filter((s) => s.items.length > 0);

  return (
    <View style={{ flex: 1, padding: space.xl }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Text variant="title">Your wardrobe</Text>
          <Text variant="caption">{tiles.length} pieces</Text>
        </View>
        <Text variant="label" style={{ color: colors.accent }}>
          Add
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: space.xl, paddingBottom: space.xl }}
      >
        {sections.map((s) => (
          <View key={s.key} style={{ gap: space.sm }}>
            <Text variant="caption">{s.title}</Text>
            <View style={styles.grid}>
              {s.items.map((it) => (
                <View key={it.id} style={{ width: cellWidth }}>
                  <ItemTile item={it} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingTop: space.md }}>
        <Button label="Style me" onPress={() => {}} />
      </View>
    </View>
  );
}

/** The item sheet, open. */
function SheetPreview() {
  return (
    <View style={{ flex: 1 }}>
      <WardrobeHome />
      <ItemSheet
        item={FIXTURE_ITEMS[0]}
        onClose={() => {}}
        onChanged={() => {}}
        onStyle={() => {}}
      />
    </View>
  );
}

/** The outfit screen's composition, with a fixed look. */
function OutfitPreview({ height }: { height: number }) {
  const [mood, setMood] = useState<Mood>('mix');
  const items = FIXTURE_SETS.layered;

  return (
    <View style={{ flex: 1, padding: space.xl }}>
      <View style={styles.headerCentred}>
        <Text variant="label" style={{ color: colors.muted }}>
          ‹ Back
        </Text>
        <Text variant="title">Your look</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text variant="caption" style={{ textAlign: 'center', marginBottom: space.sm }}>
        Styled around your cotton tee
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}
      >
        <DressingRoom items={items} height={height} />
        <View style={styles.pieces}>
          {items.map((it) => (
            <View key={it.id} style={styles.piece}>
              <Text variant="label">{it.name}</Text>
            </View>
          ))}
        </View>
        <ColourStory items={items} />
        <View style={styles.note}>
          <Text variant="body">
            Soft neutrals with one warm accent — easy to wear and hard to get wrong.
          </Text>
          <Text variant="caption">Roll the sleeves for a less formal line.</Text>
        </View>
      </ScrollView>

      <View style={{ paddingTop: space.md, gap: space.md }}>
        <MoodControl value={mood} onChange={setMood} />
        <Button label="Try another" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = {
  phone: { width: 390, flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    marginBottom: space.md,
  },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.md },
  headerCentred: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: space.sm,
  },
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
