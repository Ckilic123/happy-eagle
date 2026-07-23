import { type Href, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthSession } from '@/lib/auth';
import { colors } from '@/ui/theme';

/**
 * The wardrobe is the app, so the root does nothing but get out of the way.
 *
 * There is no welcome screen and no questionnaire: people cannot usefully
 * self-describe their style, and the honest signal is in the clothes they own. The
 * first-run invitation lives inside the wardrobe as its empty state, which means a
 * returning user never sees a gate.
 */
export default function Index() {
  const { session, loading } = useAuthSession();

  if (loading || !session) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return <Redirect href={'/wardrobe' as Href} />;
}
