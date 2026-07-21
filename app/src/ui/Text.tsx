import { Text as RNText, type TextProps } from 'react-native';

import { type TypeVariant, type } from './theme';

type Props = TextProps & { variant?: TypeVariant };

/** Themed text. `variant` picks a style from the type scale (default: body). */
export function Text({ variant = 'body', style, ...rest }: Props) {
  return <RNText style={[type[variant], style]} {...rest} />;
}
