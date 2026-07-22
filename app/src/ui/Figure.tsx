import Svg, { Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * The body the clothes hang on.
 *
 * Deliberately a *mannequin*, not a person: no face, no skin tone, no styling of its
 * own. It only has to say "this is where a body is" so the garments read as worn
 * rather than stacked. Anything more competes with the clothes, which are the hero.
 *
 * Drawn in a 100x190 box on classic fashion-figure proportions — head ≈ 1/8 of the
 * height, shoulders ≈ hips, narrow waist — and scaled by the parent, so DressingRoom
 * can place garments as fractions of the height regardless of screen size.
 */

export const FIGURE_ASPECT = 100 / 190;

/** Vertical landmarks as fractions of the figure's height — where garments anchor. */
export const ANCHOR = {
  shoulder: 33 / 190,
  waist: 76 / 190,
  hip: 93 / 190,
  ankle: 172 / 190,
} as const;

export function Figure({
  width,
  height,
  // Distinctly deeper than the page so the body never gets confused with a pale
  // garment — a lot of real clothes are white or cream.
  tone = '#CFC2B2',
  shade = '#BEAF9C',
}: {
  width: number;
  height: number;
  tone?: string;
  shade?: string;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 190">
      <Defs>
        <RadialGradient id="floor" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#1B1A17" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#1B1A17" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Contact shadow — grounds the figure so it isn't floating. */}
      <Ellipse cx="50" cy="186" rx="24" ry="4.5" fill="url(#floor)" />

      <G>
        {/* Arms, behind the torso so sleeves sit over them naturally. */}
        <Path
          d="M29 36.5 C24.5 46 22.5 58 22.5 70 C22.5 84 24 98 25.5 110 L30.5 109 C29 97 27.5 84 27.5 70 C27.5 59 29.5 48 33 39.5 Z"
          fill={shade}
        />
        <Path
          d="M71 36.5 C75.5 46 77.5 58 77.5 70 C77.5 84 76 98 74.5 110 L69.5 109 C71 97 72.5 84 72.5 70 C72.5 59 70.5 48 67 39.5 Z"
          fill={shade}
        />

        {/* Head + neck. */}
        <Ellipse cx="50" cy="12.5" rx="8.4" ry="12" fill={tone} />
        <Path d="M45.5 21 h9 v8 c0 2 -1.5 3 -4.5 3 s-4.5 -1 -4.5 -3 Z" fill={shade} />

        {/* Torso and legs as one continuous form. */}
        <Path
          d="M50 31
             C41 31 31 33 29 36.5
             C26.5 45 31.5 56 33.5 64
             C35 70 37 72.5 37.5 76
             C38 84 32.5 86 32 93
             L33 100 L34.5 132 L36.5 158 L38 172
             L45 172 L46 158 L47.5 132 L49 100
             L51 100 L52.5 132 L54 158 L55 172
             L62 172 L63.5 158 L65.5 132 L67 100
             L68 93
             C67.5 86 62 84 62.5 76
             C63 72.5 65 70 66.5 64
             C68.5 56 73.5 45 71 36.5
             C69 33 59 31 50 31 Z"
          fill={tone}
        />
      </G>
    </Svg>
  );
}
