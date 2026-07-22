import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FIXTURE_SETS } from '@/lib/fixtures';
import { DressingRoom, WornOutfit } from '@/ui/DressingRoom';
import { Text } from '@/ui/Text';
import { colors, radius, space } from '@/ui/theme';

const styles = {
  note: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
    marginBottom: space.lg,
  },
};

/**
 * Dev-only harness for eyeballing the dressing room without a phone or a wardrobe.
 * /preview?set=everyday|layered|dress&h=540
 *
 * Renders inside a fixed 390pt column so a desktop browser screenshot is phone-accurate.
 * Not linked from anywhere in the app.
 */
export default function Preview() {
  const {
    set = 'layered',
    h = '540',
    guides,
    chrome,
  } = useLocalSearchParams<{ set?: string; h?: string; guides?: string; chrome?: string }>();
  const items = FIXTURE_SETS[set] ?? FIXTURE_SETS.layered;
  const height = Number(h);

  if (!__DEV__) return null;

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#55534E' }}>
      <View
        style={{
          width: 390,
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: space.xl,
          justifyContent: 'center',
        }}
      >
        {chrome === '1' ? (
          <View style={styles.note}>
            <Text variant="body">
              Soft neutrals with one warm accent — easy to wear and hard to get wrong.
            </Text>
            <Text variant="caption">Roll the sleeves for a less formal line.</Text>
          </View>
        ) : null}
        <View>
          {chrome === '1' ? (
            <WornOutfit items={items} height={height} />
          ) : (
            <DressingRoom items={items} height={height} />
          )}
          {guides === '1' ? <Guides height={height} /> : null}
        </View>
        <Text variant="caption" style={{ textAlign: 'center', marginTop: space.lg }}>
          {set} · h={height}
        </Text>
      </View>
    </View>
  );
}

/** Horizontal rules at the body landmarks, for judging where garments actually land. */
function Guides({ height }: { height: number }) {
  const marks: [string, number][] = [
    ['shoulder', 0.2],
    ['waist', 0.39],
    ['hip', 0.5],
    ['knee', 0.72],
    ['ankle', 0.93],
  ];
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, zIndex: 99 }}>
      {marks.map(([label, f]) => (
        <View
          key={label}
          style={{
            position: 'absolute',
            top: height * f,
            left: 0,
            right: 0,
            borderTopWidth: 1,
            borderColor: '#00000033',
          }}
        >
          <Text variant="caption" style={{ fontSize: 9, color: '#0008' }}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
