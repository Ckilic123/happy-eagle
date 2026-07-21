import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Item } from '@/lib/items';

import { Text } from './Text';
import { colors, radius, space } from './theme';

/** Wardrobe grid cell: the garment on a neutral tile, name + colour below. */
export function ItemTile({ item }: { item: Item }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.imageWrap, item.hasCutout && { padding: space.md }]}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            // Cutouts float on the tile; raw photos fill it.
            contentFit={item.hasCutout ? 'contain' : 'cover'}
            transition={150}
          />
        ) : null}
      </View>
      <Text variant="label" numberOfLines={1}>
        {item.name ?? 'Item'}
      </Text>
      {item.primary_color ? <Text variant="caption">{item.primary_color}</Text> : null}
    </View>
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
  image: { flex: 1 },
});
