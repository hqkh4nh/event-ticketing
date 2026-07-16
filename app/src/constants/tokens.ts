/**
 * Design tokens for APIs that take a colour value instead of a class name:
 * vector icons and React Navigation screen options. Everything else styles
 * through NativeWind. Mirrors tailwind.config.js and DESIGN.md.
 */
export type Tokens = {
  primary: string;
  surface: string;
  surfaceContainerLowest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
};

export const tokens: { light: Tokens; dark: Tokens } = {
  light: {
    primary: '#006b5f',
    surface: '#f8f9ff',
    surfaceContainerLowest: '#ffffff',
    onSurface: '#121c2a',
    onSurfaceVariant: '#3c4947',
    outlineVariant: '#bbcac6',
  },
  dark: {
    primary: '#4fdbc8',
    surface: '#101720',
    surfaceContainerLowest: '#0b1119',
    onSurface: '#dfe3ec',
    onSurfaceVariant: '#bfc9c6',
    outlineVariant: '#3c4947',
  },
};
