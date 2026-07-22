import { Image } from 'expo-image';
import { useState } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

/**
 * A garment photo, stood upright.
 *
 * Rotating an image inside a box isn't just a transform: a quarter-turn swaps the
 * axes, so an element sized to the box would spill out of it once turned. The fix is
 * to size the element to the box's *transposed* dimensions and centre it — after the
 * rotation it lands exactly inside.
 *
 * Pass width/height when the caller already knows them; otherwise the box measures
 * itself, which costs one frame before the image appears.
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
  const w = width ?? measured.w;
  const h = height ?? measured.h;

  const quarterTurned = rotation === 90 || rotation === 270;
  const imgW = quarterTurned ? h : w;
  const imgH = quarterTurned ? w : h;

  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      onLayout={
        width === undefined || height === undefined
          ? (e) =>
              setMeasured({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          : undefined
      }
    >
      {uri && w > 0 && h > 0 ? (
        <Image
          source={{ uri }}
          contentFit={contentFit}
          transition={transition}
          onLoad={
            onNaturalSize
              ? (e) => {
                  const { width: nw, height: nh } = e.source;
                  if (nw && nh) onNaturalSize({ width: nw, height: nh });
                }
              : undefined
          }
          style={{
            position: 'absolute',
            width: imgW,
            height: imgH,
            left: (w - imgW) / 2,
            top: (h - imgH) / 2,
            transform: rotation ? [{ rotate: `${rotation}deg` }] : undefined,
          }}
        />
      ) : null}
    </View>
  );
}
