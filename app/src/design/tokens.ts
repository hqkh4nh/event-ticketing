/**
 * The only file in the repository that holds a colour value. Everything else
 * reaches colour through a NativeWind class name, which resolves to a CSS
 * variable fed from here.
 *
 * Mirrors the `colors` and `colorsDark` tables in DESIGN.md. The palette is the
 * "Ember" identity (warm Ink/Paper surfaces, coral primary, mint reserved for
 * success) carried on the Material 3 role set this product actually uses: the
 * `*-fixed` roles from the M3 spec are deliberately absent because nothing
 * renders them. Status roles (`secondary`, `tertiary`, `error`, `warning`) keep
 * their tuned values; only the surface ladder, `primary`, `success`, and the
 * neutral text/outline roles carry the Ember colours.
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
  // Paper: a warm white, not cold grey-blue and not pure white.
  surface: '#fbf7f4',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f6f1ed',
  'surface-container': '#f1ebe6',
  'surface-container-high': '#ebe4de',
  'on-surface': '#1b1720',
  'on-surface-variant': '#6b6472',
  outline: '#8b8391',
  'outline-variant': '#e4dcd5',

  // Coral runs a touch deeper in light than in dark: the vivid #ff6b4a fails
  // AA as small text on Paper, so light uses a coral dark enough to pass and
  // pairs it with white text; dark keeps the vivid coral with dark-brown text.
  primary: '#c7361a',
  'on-primary': '#ffffff',
  'primary-container': '#ffe3db',
  'on-primary-container': '#7a2a17',

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
  // Ink: a warm near-black, never pure black, to keep depth in a dark hall.
  surface: '#16141b',
  'surface-container-lowest': '#221e2a',
  'surface-container-low': '#1c1924',
  'surface-container': '#272430',
  'surface-container-high': '#2c2734',
  'on-surface': '#f1edf4',
  'on-surface-variant': '#a79fb0',
  outline: '#786f82',
  'outline-variant': '#302b39',

  primary: '#ff6b4a',
  'on-primary': '#2a0f07',
  'primary-container': '#3a241d',
  'on-primary-container': '#ffb4a1',

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

  success: '#34d399',
  'on-success': '#05271c',
  'success-container': '#123227',
  'on-success-container': '#6ee7b7',

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
