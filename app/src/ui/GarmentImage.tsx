import { Image } from 'expo-image';
import { useState } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

/**
 * A garment photo, stood upright.
 *
 * Two cases, and only one of them is hard:
 *
 * Upright or upside-down (rotation 0 or 180) — the image keeps the box's proportions,
 * so it just fills it. No measuring, which means no blank first frame.
 *
 * On its side (90 or 270) — a quarter-turn swaps the axes, so an element sized to the
 * box would spill out once turned. It has to be sized to the box's *transposed*
 * dimensions and centred, which means knowing the box. The parent passes width/height
 * when it already knows them; otherwise the box measures itself and the image appears
 * a frame later.
 */
export function GarmentImage({
  uri,
  rotation = 0,
  contentFit = 'contain',
  width,
  height,
  style,
  transition = 150,
  onNaturalSize,
}: {
  uri: string | null;
  rotation?: number;
  contentFit?: 'contain' | 'cover';
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  transition?: number;
  /** The source's own pixel dimensions, before any rotation is applied. */
  onNaturalSize?: (size: { width: number; height: number }) => void;
}) {
  const [measured, setMeasured] = useState({ w: width ?? 0, h: height ?? 0 });
  const quarterTurned = rotation === 90 || rotation === 270;

  const handleLoad = onNaturalSize
    ? (e: { source: { width: number; height: number } }) => {
        const { width: nw, height: nh } = e.source;
        if (nw && nh) onNaturalSize({ width: nw, height: nh });
      }
    : undefined;

  // Common case: nothing to transpose, so fill the box directly.
  if (!quarterTurned) {
    return (
      <View style={[{ overflow: 'hidden' }, style]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              flex: 1,
              transform: rotation === 180 ? [{ rotate: '180deg' }] : undefined,
            }}
            contentFit={contentFit}
            transition={transition}
            onLoad={handleLoad}
          />
        ) : null}
      </View>
    );
  }

  const w = width ?? measured.w;
  const h = height ?? measured.h;
  const imgW = h; // axes swap under a quarter-turn
  const imgH = w;

  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      onLayout={
        width === undefined || height === undefined
          ? (e) => setMeasured({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          : undefined
      }
    >
      {uri && w > 0 && h > 0 ? (
        <Image
          source={{ uri }}
          contentFit={contentFit}
          transition={transition}
          onLoad={handleLoad}
          style={{
            position: 'absolute',
            width: imgW,
            height: imgH,
            left: (w - imgW) / 2,
            top: (h - imgH) / 2,
            transform: [{ rotate: `${rotation}deg` }],
          }}
        />
      ) : null}
    </View>
  );
}
