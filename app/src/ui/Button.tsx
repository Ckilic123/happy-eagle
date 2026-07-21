import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

/** One clear action per screen. Primary = ink fill; secondary = ghost. */
export function Button({ label, variant = 'primary', style, ...rest }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text variant="bodyStrong" style={{ color: primary ? colors.surface : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.hairline },
  pressed: { opacity: 0.85 },
});
