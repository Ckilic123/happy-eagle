import { useState } from 'react';
import { View } from 'react-native';

import type { Item } from '@/lib/items';

import { FIGURE_ASPECT, Figure } from './Figure';
import { GarmentImage } from './GarmentImage';

/**
 * The outfit, worn.
 *
 * Garments are sized by *width* and left to fall to their natural height, the way a
 * real garment does — a long coat hangs longer than a cropped jacket without anyone
 * configuring it. Every number below is a fraction of the figure's height, so the
 * whole composition scales with the screen.
 *
 * This only works because cutouts are trimmed to the garment (see scripts/cutouts.py).
 * Untrimmed cutouts keep the original photo frame and float at arbitrary sizes.
 */

type Slot = {
  w: number; // garment width ÷ figure height
  top?: number; // top edge ÷ figure height
  bottom?: number; // bottom edge ÷ figure height (shoes sit on the floor)
  dx?: number; // nudge from centre ÷ figure height
  z: number;
  fallbackAspect: number; // used for the first frame, before the image reports its size
};

// Widths are tuned so each garment lands on the body: the figure's shoulders span
// 0.195 of its height and the hips 0.19, and a garment has to be a little wider than
// the body part it covers. Outerwear sits *behind* the top on purpose — an open jacket
// shows its shoulders and sleeves around whatever you're wearing under it, so layering
// it in front would just hide the top completely.
const SLOTS: Record<string, Slot> = {
  shoes: { w: 0.27, bottom: 0.005, z: 1, fallbackAspect: 2.2 },
  bottom: { w: 0.223, top: 0.4, z: 2, fallbackAspect: 0.433 },
  dress: { w: 0.35, top: 0.136, z: 4, fallbackAspect: 0.559 },
  top: { w: 0.348, top: 0.148, z: 4, fallbackAspect: 0.844 },
  outerwear: { w: 0.3, top: 0.152, z: 5, fallbackAspect: 0.759 },
  accessory: { w: 0.13, top: 0.5, dx: 0.215, z: 6, fallbackAspect: 0.846 },
};

const LAYER_ORDER = ['shoes', 'bottom', 'dress', 'top', 'outerwear', 'accessory'];

export function DressingRoom({ items, height }: { items: Item[]; height: number }) {
  const figureWidth = height * FIGURE_ASPECT;

  // A dress replaces a top+bottom — never wear all three at once.
  const wearing = items.some((i) => i.category === 'dress')
    ? items.filter((i) => i.category !== 'top' && i.category !== 'bottom')
    : items;

  const layers = LAYER_ORDER.map((c) => wearing.find((i) => i.category === c)).filter(
    (i): i is Item => !!i,
  );

  return (
    <View style={{ width: figureWidth, height, alignSelf: 'center' }}>
      <Figure width={figureWidth} height={height} />
      {layers.map((item) => (
        <Garment key={item.id} item={item} figureHeight={height} figureWidth={figureWidth} />
      ))}
    </View>
  );
}

function Garment({
  item,
  figureHeight,
  figureWidth,
}: {
  item: Item;
  figureHeight: number;
  figureWidth: number;
}) {
  const slot = SLOTS[item.category ?? ''];
  const [aspect, setAspect] = useState<number | null>(null);
  if (!slot || !item.imageUrl) return null;

  // A quarter-turn swaps the garment's proportions, so a sideways photo of jeans
  // hangs as tall jeans rather than as a wide box.
  const natural = aspect ?? slot.fallbackAspect;
  const quarterTurned = item.rotation === 90 || item.rotation === 270;
  const w = slot.w * figureHeight;
  const h = w / (quarterTurned ? 1 / natural : natural);
  const left = (figureWidth - w) / 2 + (slot.dx ?? 0) * figureHeight;
  const top =
    slot.bottom !== undefined ? figureHeight - slot.bottom * figureHeight - h : slot.top! * figureHeight;

  return (
    <GarmentImage
      uri={item.imageUrl}
      rotation={item.rotation}
      width={w}
      height={h}
      transition={180}
      style={{ position: 'absolute', left, top, width: w, height: h, zIndex: slot.z }}
      onNaturalSize={({ width, height }) => setAspect(width / height)}
    />
  );
}
