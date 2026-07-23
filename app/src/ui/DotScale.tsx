import { Pressable, View } from 'react-native';

import { colors } from './theme';

/**
 * A 1–5 rating as five tappable dots.
 *
 * Filled dots read as a quantity at a glance, which a number does not — "3" means
 * nothing until you know the range, whereas three-of-five is instantly legible. Each
 * dot is its own tap target with generous hit slop, so setting a value is one tap
 * rather than a drag.
 */
export function DotScale({
  value,
  onChange,
  size = 12,
}: {
  value: number | null;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== null && n <= value;
        return (
          <Pressable
            key={n}
            disabled={!onChange}
            onPress={() => onChange?.(n)}
            hitSlop={8}
            accessibilityRole="adjustable"
            accessibilityLabel={`Set to ${n} of 5`}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: filled ? colors.ink : 'transparent',
              borderWidth: 1,
              borderColor: filled ? colors.ink : colors.hairline,
            }}
          />
        );
      })}
    </View>
  );
}
