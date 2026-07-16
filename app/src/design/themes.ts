import { vars } from 'nativewind';

import { colorVarName, hexToRgbChannels, palette, type Palette } from './tokens';

/**
 * NativeWind resolves CSS variables through React context rather than a real
 * cascade, so a media query in the stylesheet cannot swap them on native. The
 * documented approach is to apply a `vars()` style object at the root and let
 * it flow down, which is what `<ThemedRoot>` does.
 */
function toVars(colors: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([role, hex]) => [
      colorVarName(role as keyof Palette),
      hexToRgbChannels(hex),
    ]),
  );
}

export const themes = {
  light: vars(toVars(palette.light)),
  dark: vars(toVars(palette.dark)),
};
