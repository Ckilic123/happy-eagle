import { Pressable, StyleSheet, View } from 'react-native';

import type { Item } from '@/lib/items';

import { GarmentImage } from './GarmentImage';
import { Text } from './Text';
import { colors, radius, space } from './theme';

/** Wardrobe grid cell: the garment on a neutral tile, name + colour below. */
export function ItemTile({
  item,
  selecting = false,
  selected = false,
  onPress,
  onLongPress,
}: {
  item: Item;
  selecting?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole={selecting ? 'checkbox' : 'imagebutton'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.name ?? 'Item'}
    >
      <View
        style={[
          styles.imageWrap,
          item.hasCutout && { padding: space.md },
          selected && styles.selected,
        ]}
      >
        <GarmentImage
          uri={item.imageUrl}
          rotation={item.rotation}
          // Always fit, never fill: "cover" on a turned photo crops against the
          // transposed box, which zooms into the middle of the garment.
          contentFit="contain"
          style={styles.image}
        />
        {!item.hasCutout && !selecting ? (
          <View style={styles.pending}>
            <Text variant="caption" style={{ fontSize: 10 }}>
              original
            </Text>
          </View>
        ) : null}
        {selecting ? (
          <View style={[styles.mark, selected && styles.markOn]}>
            {selected ? <Text style={styles.tick}>✓</Text> : null}
          </View>
        ) : null}
      </View>
      <Text variant="label" numberOfLines={1}>
        {item.name ?? 'Item'}
      </Text>
      {item.primary_color ? <Text variant="caption">{item.primary_color}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: space.xs },
  imageWrap: {
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  selected: { borderColor: colors.accent, borderWidth: 2 },
  image: { flex: 1 },
  // Background removal runs on a schedule, so "no cutout yet" is a normal state —
  // say so, rather than leaving you guessing whether it failed.
  pending: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  mark: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 24,
    height: 24,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: colors.surface, fontSize: 14, lineHeight: 18 },
});
