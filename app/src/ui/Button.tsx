import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './theme';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  /**
   * `danger` fills brick — for a destructive action that IS the point of the screen.
   * `dangerQuiet` only tints the label, for a destructive action sitting beside a
   * primary one: a filled red block out-shouts the ink button next to it, which puts
   * "Remove" above "What goes with this?" in the eye's order. It shouldn't be.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'dangerQuiet';
};

/** One clear action per screen. Primary = ink fill; secondary = ghost; danger = brick. */
export function Button({ label, variant = 'primary', style, ...rest }: Props) {
  const filled = variant === 'primary' || variant === 'danger';
  const label_color = filled ? colors.surface : variant === 'dangerQuiet' ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text variant="bodyStrong" style={{ color: label_color }}>
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
  danger: { backgroundColor: colors.danger },
  dangerQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.85 },
});
