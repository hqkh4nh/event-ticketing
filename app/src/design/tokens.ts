/**
 * The only file in the repository that holds a colour value. Everything else
 * reaches colour through a NativeWind class name, which resolves to a CSS
 * variable fed from here.
 *
 * Mirrors the `colors` and `colorsDark` tables in DESIGN.md. The palette is
 * Material 3, but only the roles this product actually uses: the `*-fixed`
 * roles from the M3 spec are deliberately absent because nothing renders them.
 */

export type ColorRole =
  | 'surface'
  | 'surface-container-lowest'
  | 'surface-container-low'
  | 'surface-container'
  | 'surface-container-high'
  | 'on-surface'
  | 'on-surface-variant'
  | 'outline'
  | 'outline-variant'
  | 'primary'
  | 'on-primary'
  | 'primary-container'
  | 'on-primary-container'
  | 'secondary'
  | 'on-secondary'
  | 'secondary-container'
  | 'on-secondary-container'
  | 'tertiary'
  | 'on-tertiary'
  | 'tertiary-container'
  | 'on-tertiary-container'
  | 'error'
  | 'on-error'
  | 'error-container'
  | 'on-error-container'
  | 'success'
  | 'on-success'
  | 'success-container'
  | 'on-success-container'
  | 'warning'
  | 'on-warning'
  | 'warning-container'
  | 'on-warning-container';

export type Palette = Record<ColorRole, string>;

const light: Palette = {
  surface: '#f8f9ff',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#eff4ff',
  'surface-container': '#e6eeff',
  'surface-container-high': '#dee9fc',
  'on-surface': '#121c2a',
  'on-surface-variant': '#3c4947',
  outline: '#6c7a77',
  'outline-variant': '#bbcac6',

  primary: '#006b5f',
  'on-primary': '#ffffff',
  'primary-container': '#14b8a6',
  'on-primary-container': '#00423b',

  secondary: '#a93349',
  'on-secondary': '#ffffff',
  'secondary-container': '#fe7488',
  'on-secondary-container': '#730425',

  tertiary: '#9b4426',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#f38764',
  'on-tertiary-container': '#6c2106',

  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  success: '#0f7350',
  'on-success': '#ffffff',
  'success-container': '#a6f2ce',
  'on-success-container': '#00382a',

  warning: '#8a5300',
  'on-warning': '#ffffff',
  'warning-container': '#ffddb3',
  'on-warning-container': '#2c1700',
};

const dark: Palette = {
  // Never pure black. #101720 keeps depth in a dark hall, per DESIGN.md.
  surface: '#101720',
  'surface-container-lowest': '#0b1119',
  'surface-container-low': '#191f28',
  'surface-container': '#1d232c',
  'surface-container-high': '#272e37',
  'on-surface': '#dfe3ec',
  'on-surface-variant': '#bfc9c6',
  outline: '#899490',
  'outline-variant': '#3c4947',

  primary: '#4fdbc8',
  'on-primary': '#00382f',
  'primary-container': '#005048',
  'on-primary-container': '#71f8e4',

  secondary: '#ffb2b9',
  'on-secondary': '#5f1122',
  'secondary-container': '#891933',
  'on-secondary-container': '#ffdadc',

  tertiary: '#ffb59e',
  'on-tertiary': '#5b1c00',
  'tertiary-container': '#7c2d11',
  'on-tertiary-container': '#ffdbd0',

  error: '#ffb4ab',
  'on-error': '#690005',
  'error-container': '#93000a',
  'on-error-container': '#ffdad6',

  success: '#5cdcac',
  'on-success': '#00382a',
  'success-container': '#00543e',
  'on-success-container': '#a6f2ce',

  warning: '#ffb95c',
  'on-warning': '#4a2800',
  'warning-container': '#693c00',
  'on-warning-container': '#ffddb3',
};

export const palette = { light, dark };

/** The CSS variable a colour role resolves to, shared with tailwind.config.js. */
export function colorVarName(role: ColorRole): string {
  return `--color-${role}`;
}

/**
 * Converts `#006b5f` to `0 107 95`. Tailwind needs the channels unwrapped so
 * that `rgb(var(--color-primary) / <alpha-value>)` can apply opacity.
 */
export function hexToRgbChannels(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}
