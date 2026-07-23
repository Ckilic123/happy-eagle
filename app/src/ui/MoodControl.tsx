import { Pressable, View } from 'react-native';

import type { Mood } from '@/lib/suggest';

import { Text } from './Text';
import { colors, radius, space } from './theme';

const STEPS: { key: Mood; label: string }[] = [
  { key: 'safe', label: 'Safe' },
  { key: 'mix', label: 'Mix it up' },
  { key: 'surprise', label: 'Surprise me' },
];

/**
 * How adventurous this look should be.
 *
 * This replaces the onboarding question that asked the same thing once, forever. It
 * belongs here instead: adventurousness is a mood, not a trait — the same person wants
 * safe on Monday and surprising on Friday — and the answer is only meaningful while
 * you're looking at a look you can change.
 *
 * Three discrete stops rather than a free slider: the values are categorical, and a
 * slider would imply a precision that isn't there.
 */
export function MoodControl({
  value,
  onChange,
  disabled,
}: {
  value: Mood;
  onChange: (m: Mood) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="caption" style={{ textAlign: 'center' }}>
        How adventurous?
      </Text>
      <View style={[styles.track, disabled && { opacity: 0.5 }]}>
        {STEPS.map((s) => {
          const on = s.key === value;
          return (
            <Pressable
              key={s.key}
              disabled={disabled}
              onPress={() => onChange(s.key)}
              style={[styles.step, on && styles.stepOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text variant="label" style={{ color: on ? colors.surface : colors.muted }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = {
  track: {
    flexDirection: 'row' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 3,
    gap: 3,
  },
  step: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.chip,
  },
  stepOn: { backgroundColor: colors.ink },
};
