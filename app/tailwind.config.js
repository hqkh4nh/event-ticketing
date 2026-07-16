/**
 * Holds no colour values. Every role below resolves to a CSS variable that
 * `src/design/themes.ts` fills from `src/design/tokens.ts`, the single source
 * of truth. That is why `dark:` never appears on a colour class: the variable
 * already carries the active scheme.
 */

const COLOR_ROLES = [
  'surface',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'on-surface',
  'on-surface-variant',
  'outline',
  'outline-variant',
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'tertiary',
  'on-tertiary',
  'tertiary-container',
  'on-tertiary-container',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'success',
  'on-success',
  'success-container',
  'on-success-container',
  'warning',
  'on-warning',
  'warning-container',
  'on-warning-container',
];

const colors = Object.fromEntries(
  COLOR_ROLES.map((role) => [role, `rgb(var(--color-${role}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Only for differences that are not colour, such as dropping shadows in dark.
  darkMode: 'media',
  theme: {
    extend: {
      colors,
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'display-sm': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        'headline-md': ['20px', { lineHeight: '28px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'label-md': ['14px', { lineHeight: '20px' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
        'numeric-lg': ['28px', { lineHeight: '36px' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '0.75rem', // input
        lg: '1rem', // card
        xl: '1.5rem',
        full: '9999px', // button
      },
      spacing: {
        'container-padding': '20px',
        gutter: '16px',
        'touch-target-min': '48px',
        'cta-height': '52px',
        'bottom-nav-height': '80px',
      },
      maxWidth: {
        // Reading width on desktop web. Native never reaches this.
        content: '800px',
      },
      fontFamily: {
        sans: ['BeVietnamPro_400Regular'],
        medium: ['BeVietnamPro_500Medium'],
        semibold: ['BeVietnamPro_600SemiBold'],
        bold: ['BeVietnamPro_700Bold'],
      },
    },
  },
  plugins: [],
};
