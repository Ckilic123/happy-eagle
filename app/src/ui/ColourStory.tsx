import { View } from 'react-native';

import type { Item } from '@/lib/items';

import { Text } from './Text';
import { colors, radius, space } from './theme';

/**
 * A look's colours, as colours.
 *
 * The whole point of the app is imagining how the colours you already own work
 * together, and until now nothing showed colour *as* colour — only the word "navy",
 * which you cannot hold up against another word and judge. These are sampled from the
 * garments' own pixels.
 *
 * Bands are weighted by how much of the look each garment covers, so a coat's colour
 * reads as dominant and a bag's as an accent — which is how the outfit will actually
 * look on a person.
 */

/** Roughly how much of a worn outfit each kind of garment occupies. */
const AREA: Record<string, number> = {
  outerwear: 3,
  dress: 3,
  top: 2,
  bottom: 2.5,
  shoes: 0.6,
  accessory: 0.4,
};

export function ColourStory({ items }: { items: Item[] }) {
  const bands = items
    .filter((i) => i.colors.length > 0)
    .map((i) => ({ hex: i.colors[0], weight: AREA[i.category ?? ''] ?? 1 }));

  // Nothing to show until the cutout worker has sampled these garments. Silence beats
  // an empty strip that looks like a bug.
  if (bands.length < 2) return null;

  const total = bands.reduce((s, b) => s + b.weight, 0);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.strip}>
        {bands.map((b, i) => (
          <View
            key={`${b.hex}-${i}`}
            style={{ flex: b.weight / total, backgroundColor: b.hex }}
            accessibilityLabel={`Colour ${b.hex}`}
          />
        ))}
      </View>
      <Text variant="caption" style={{ textAlign: 'center' }}>
        {describe(bands.map((b) => b.hex))}
      </Text>
    </View>
  );
}

/**
 * Name the palette in plain words.
 *
 * Done here rather than by asking the model: it's a fact about the hex values, so
 * spending a round trip and tokens on it would be slower, costlier and less reliable.
 */
function describe(hexes: string[]): string {
  const hsl = hexes.map(toHsl);
  const neutrals = hsl.filter((c) => c.s < 0.18 || c.l < 0.14 || c.l > 0.9).length;
  const warm = hsl.filter((c) => c.s >= 0.18 && (c.h < 60 || c.h > 320)).length;
  const cool = hsl.filter((c) => c.s >= 0.18 && c.h >= 150 && c.h <= 260).length;
  const vivid = hsl.filter((c) => c.s > 0.55).length;

  if (neutrals === hsl.length) return 'All neutrals — quiet and easy to wear';
  if (neutrals >= hsl.length - 1 && warm) return 'Neutrals with one warm accent';
  if (neutrals >= hsl.length - 1 && cool) return 'Neutrals with one cool accent';
  if (warm && cool) return 'Warm and cool, held together';
  if (vivid >= 2) return 'Two strong colours — a bold pairing';
  if (warm) return 'A warm palette';
  if (cool) return 'A cool palette';
  return 'A considered mix';
}

function toHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}

/** A garment's own colours, as small chips. Used on the item sheet. */
export function Swatches({ hexes }: { hexes: string[] }) {
  if (!hexes.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: space.xs }}>
      {hexes.map((hex, i) => (
        <View key={`${hex}-${i}`} style={[styles.chip, { backgroundColor: hex }]} />
      ))}
    </View>
  );
}

const styles = {
  strip: {
    flexDirection: 'row' as const,
    height: 44,
    borderRadius: radius.button,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
};
