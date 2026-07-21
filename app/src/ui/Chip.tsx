import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

/** Selectable pill. Selected → soft terracotta fill + accent border. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.on : styles.off,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text variant="label" style={{ color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  off: { backgroundColor: colors.surface, borderColor: colors.hairline },
  on: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
});
