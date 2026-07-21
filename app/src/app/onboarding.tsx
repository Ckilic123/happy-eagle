import { type Href, router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { saveOnboarding } from '@/lib/profile';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';

const STYLE = [
  { k: 'classic', label: 'Classic & clean' },
  { k: 'relaxed', label: 'Relaxed & casual' },
  { k: 'bold', label: 'Bold & expressive' },
  { k: 'polished', label: 'Polished & elegant' },
];
const DRESS = [
  { k: 'work', label: 'Work' },
  { k: 'casual', label: 'Everyday casual' },
  { k: 'going-out', label: 'Going out' },
  { k: 'active', label: 'Active' },
];
const ADVENTURE = [
  { k: 'safe', label: 'Keep it safe' },
  { k: 'mix', label: 'Mix it up' },
  { k: 'surprise', label: 'Surprise me' },
] as const;

function toggle(list: string[], k: string): string[] {
  return list.includes(k) ? list.filter((x) => x !== k) : [...list, k];
}

export default function Onboarding() {
  const [styleVibes, setStyleVibes] = useState<string[]>([]);
  const [dressFor, setDressFor] = useState<string[]>([]);
  const [adventurousness, setAdventurousness] = useState<'safe' | 'mix' | 'surprise'>('mix');
  const [saving, setSaving] = useState(false);

  const canContinue = styleVibes.length > 0 && dressFor.length > 0 && !saving;

  async function onContinue() {
    setSaving(true);
    try {
      await saveOnboarding({ style_vibes: styleVibes, dress_for: dressFor, adventurousness });
      router.replace('/wardrobe' as Href);
    } catch {
      Alert.alert('Could not save', 'Please check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display">A few quick questions.</Text>

        <Group title="Which feels most like you?" hint="Pick any.">
          {STYLE.map((o) => (
            <Chip
              key={o.k}
              label={o.label}
              selected={styleVibes.includes(o.k)}
              onPress={() => setStyleVibes((s) => toggle(s, o.k))}
            />
          ))}
        </Group>

        <Group title="Most days, what are you dressing for?" hint="Pick any.">
          {DRESS.map((o) => (
            <Chip
              key={o.k}
              label={o.label}
              selected={dressFor.includes(o.k)}
              onPress={() => setDressFor((s) => toggle(s, o.k))}
            />
          ))}
        </Group>

        <Group title="When we suggest outfits…" hint="Pick one.">
          {ADVENTURE.map((o) => (
            <Chip
              key={o.k}
              label={o.label}
              selected={adventurousness === o.k}
              onPress={() => setAdventurousness(o.k)}
            />
          ))}
        </Group>
      </ScrollView>

      <View style={{ paddingTop: space.md }}>
        <Button
          label={saving ? 'Saving…' : 'Continue'}
          onPress={onContinue}
          disabled={!canContinue}
          style={!canContinue ? { opacity: 0.5 } : undefined}
        />
      </View>
    </Screen>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="title">{title}</Text>
        <Text variant="caption">{hint}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>
    </View>
  );
}
