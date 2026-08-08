/**
 * Widths where the layout changes shape. Kept here because the same numbers
 * decide the tab bar position, the discovery grid, and the event detail
 * columns, and those three drifting apart is what makes a layout feel broken.
 */

/** Bottom tabs become a top bar, and single columns become grids. */
export const WIDE_BREAKPOINT = 768;

/** Enough width for a second column beside the main content. */
export const DESKTOP_BREAKPOINT = 1024;

/** Reading width for detail and form screens. */
export const CONTENT_WIDTH = 800;

/** Browse width for the discovery grid and the shells that frame it. */
export const WIDE_WIDTH = 1200;
