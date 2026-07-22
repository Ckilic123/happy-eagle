import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Item } from '@/lib/items';

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
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            // Cutouts float on the tile; raw photos fill it.
            contentFit={item.hasCutout ? 'contain' : 'cover'}
            transition={150}
          />
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
