import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';

import {
  CATEGORIES,
  deleteItems,
  type Item,
  OCCASIONS,
  rotateItems,
  updateItem,
} from '@/lib/items';

import { Button } from './Button';
import { Chip } from './Chip';
import { Swatches } from './ColourStory';
import { DotScale } from './DotScale';
import { GarmentImage } from './GarmentImage';
import { Text } from './Text';
import { colors, radius, space } from './theme';

/**
 * One garment, up close — and the only place its tags can be corrected.
 *
 * A sheet rather than a pushed screen: you are inspecting a thing, not travelling
 * somewhere, and keeping the wardrobe visible behind it says so. Edits write on tap
 * with no Save button, because every field here is a single choice and a half-made
 * edit means nothing.
 *
 * Why editing matters at all: the Stylist chooses outfits purely from these tags and
 * never sees the photograph. One wrong formality silently skews every later
 * suggestion, and until now there was no way to see that, let alone fix it.
 */
export function ItemSheet({
  item,
  onClose,
  onChanged,
  onStyle,
}: {
  item: Item | null;
  onClose: () => void;
  /** Something was edited, rotated or removed — the wardrobe should reload. */
  onChanged: () => void;
  /** Build a look around this garment. */
  onStyle: (item: Item) => void;
}) {
  const [open, setOpen] = useState<string | null>(null); // which row is expanded
  const [draft, setDraft] = useState<Item | null>(null); // optimistic local copy

  const shown = draft?.id === item?.id ? draft : item;
  if (!item || !shown) return null;

  /** Apply locally first so the dot or chip responds instantly, then persist. */
  async function patch(next: Partial<Item>) {
    setDraft({ ...shown!, ...next });
    try {
      await updateItem(shown!.id, next);
      onChanged();
    } catch (e) {
      setDraft(shown!); // put it back — the tag did not save
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function close() {
    setOpen(null);
    setDraft(null);
    onClose();
  }

  async function onRotate() {
    await rotateItems([shown!.id], [shown!]);
    setDraft({ ...shown!, rotation: (shown!.rotation + 90) % 360 });
    onChanged();
  }

  function onRemove() {
    Alert.alert('Remove this item?', 'This deletes the photo too, and cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItems([shown!.id]);
            close();
            onChanged();
          } catch (e) {
            Alert.alert('Could not remove', e instanceof Error ? e.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  const toggleOccasion = (o: string) =>
    patch({
      occasions: shown.occasions.includes(o)
        ? shown.occasions.filter((x) => x !== o)
        : [...shown.occasions, o],
    });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      {/* Tapping the dimmed wardrobe behind the sheet dismisses it. */}
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={{ padding: space.xl, paddingTop: space.md, gap: space.lg }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <GarmentImage
              uri={shown.imageUrl}
              rotation={shown.rotation}
              contentFit="contain"
              style={{ flex: 1 }}
            />
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="title">{shown.name ?? 'Item'}</Text>
            <Text variant="caption">
              {[shown.category, shown.primary_color].filter(Boolean).join(' · ') || 'Not tagged yet'}
            </Text>
            <Swatches hexes={shown.colors} />
          </View>

          <View style={styles.rows}>
            <Row
              label="Category"
              value={shown.category ?? 'Not set'}
              expanded={open === 'category'}
              onPress={() => setOpen(open === 'category' ? null : 'category')}
            >
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={shown.category === c}
                    onPress={() => {
                      patch({ category: c });
                      setOpen(null);
                    }}
                  />
                ))}
              </View>
            </Row>

            <Row
              label="Formality"
              hint="1 loungewear · 5 black-tie"
              trailing={<DotScale value={shown.formality} onChange={(n) => patch({ formality: n })} />}
            />

            <Row
              label="Warmth"
              hint="1 hot weather · 5 deep winter"
              trailing={<DotScale value={shown.warmth} onChange={(n) => patch({ warmth: n })} />}
            />

            <Row
              label="Wear it for"
              value={shown.occasions.length ? shown.occasions.join(', ') : 'Not set'}
              expanded={open === 'occasions'}
              onPress={() => setOpen(open === 'occasions' ? null : 'occasions')}
              last
            >
              <View style={styles.chips}>
                {OCCASIONS.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={shown.occasions.includes(o)}
                    onPress={() => toggleOccasion(o)}
                  />
                ))}
              </View>
            </Row>
          </View>

          <View style={{ gap: space.sm }}>
            <Button
              label="What goes with this?"
              onPress={() => {
                close();
                onStyle(shown);
              }}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="Rotate ↻" variant="secondary" onPress={onRotate} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Remove" variant="dangerQuiet" onPress={onRemove} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** One settings row. Either expands to reveal chips, or carries a control on the right. */
function Row({
  label,
  value,
  hint,
  trailing,
  expanded,
  onPress,
  last,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  trailing?: React.ReactNode;
  expanded?: boolean;
  onPress?: () => void;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={!last ? styles.rowDivider : undefined}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={styles.row}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{label}</Text>
          {hint ? <Text variant="caption">{hint}</Text> : null}
        </View>
        {trailing ?? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="caption" style={{ color: colors.muted }}>
              {value}
            </Text>
            <Text variant="caption" style={{ color: colors.muted }}>
              {expanded ? '⌄' : '›'}
            </Text>
          </View>
        )}
      </Pressable>
      {expanded && children ? <View style={{ paddingBottom: space.md }}>{children}</View> : null}
    </View>
  );
}

const styles = {
  backdrop: { flex: 1, backgroundColor: '#1B1A1755' },
  sheet: {
    height: '88%' as const,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.card + 6,
    borderTopRightRadius: radius.card + 6,
  },
  handle: {
    alignSelf: 'center' as const,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    marginTop: space.sm,
  },
  hero: {
    // Deliberately modest. You already know what your own shirt looks like — the
    // reason you opened this sheet is the tags and the actions, so a square hero
    // that pushes them below the fold serves the photograph, not the person.
    height: 200,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    overflow: 'hidden' as const,
  },
  rows: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 56, // comfortable tap target
    gap: space.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.sm },
};
