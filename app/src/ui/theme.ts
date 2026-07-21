// Pumpkin design tokens — see docs/design-guidelines.md.
// Warm, editorial, premium-minimal. The garment is the colour; the UI stays neutral.

export const colors = {
  bg: '#F5F2EC', // warm stone background
  surface: '#FBFAF7', // cards, item tiles
  ink: '#1B1A17', // primary text, filled buttons
  muted: '#6B665D', // secondary text
  hairline: '#E7E2D9', // borders (1px)
  accent: '#B5603E', // terracotta — CTA / active only
  accentSoft: '#EFD9CD', // accent backgrounds (chips, highlights)
  success: '#4E6B4A',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24, // default screen padding
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  chip: 999,
  button: 14,
  card: 18,
} as const;

// Font family keys must match the names registered via useFonts() at the app root.
export const fonts = {
  display: 'Fraunces_500Medium',
  body: 'HankenGrotesk_400Regular',
  bodyStrong: 'HankenGrotesk_600SemiBold',
  label: 'HankenGrotesk_500Medium',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 24, color: colors.ink },
  label: { fontFamily: fonts.label, fontSize: 14, lineHeight: 20, color: colors.ink },
  caption: { fontFamily: fonts.label, fontSize: 12, lineHeight: 16, color: colors.muted },
} as const;

export type TypeVariant = keyof typeof type;
