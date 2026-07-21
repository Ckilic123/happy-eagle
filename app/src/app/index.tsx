import { type Href, router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { colors, space } from '@/ui/theme';

export default function Welcome() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: space.md }}>
        <Text variant="display">Rediscover the wardrobe you already own.</Text>
        <Text variant="body" style={{ color: colors.muted }}>
          A quiet styling companion for the clothes already in your closet. Less shopping. More
          wearing.
        </Text>
      </View>
      <View style={{ paddingTop: space.xl }}>
        <Button label="Begin" onPress={() => router.push('/onboarding' as Href)} />
      </View>
    </Screen>
  );
}
