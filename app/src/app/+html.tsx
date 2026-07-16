import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { palette } from '@/design/tokens';

/**
 * The HTML shell wrapped around every page of the static web export. It runs
 * only while the export is built, so it has no hooks, no context, and no
 * knowledge of the running app; anything that depends on the user belongs in a
 * layout instead.
 *
 * Colours come from the token module rather than literals so this file does not
 * become a second place the palette is written down.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Lets the browser paint its own chrome, the scrollbars and the text
            caret, in the scheme the user asked for. Without it they stay light
            against a dark app. */}
        <meta name="color-scheme" content="light dark" />

        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={palette.light.surface}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={palette.dark.surface}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
