/**
 * Locale-aware formatting. Every function takes the active language because the
 * app ships `vi` and `en` and lets the user switch at runtime; a hardcoded
 * Vietnamese format reaches the English user unchanged. "200.000" is two
 * hundred thousand in `vi` and two hundred in `en`, so grouping a price by hand
 * misstates it rather than merely looking foreign.
 *
 * Intl is safe on every target: React Native builds Hermes with
 * HERMES_ENABLE_INTL, and web has it natively.
 */

/** Constructing an Intl formatter is expensive, so each locale keeps one. */
function memoizeByLocale<T>(create: (locale: string) => T): (locale: string) => T {
  const cache = new Map<string, T>();

  return (locale) => {
    let formatter = cache.get(locale);
    if (!formatter) {
      formatter = create(locale);
      cache.set(locale, formatter);
    }
    return formatter;
  };
}

const amountFormat = memoizeByLocale((locale) => new Intl.NumberFormat(locale));

// A named month rather than a number: `vi` renders a numeric day-month as
// "15-08", which no one writes, and `en` renders it as "08/15", which the rest
// of the world reads as the 8th of a month. "15 thg 8" and "Aug 15" are
// unambiguous in both. Component options are used rather than dateStyle because
// Hermes on Android backs Intl with a Java implementation where the style
// shorthands are the least complete part.
const dayMonthFormat = memoizeByLocale(
  (locale) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
);

const dateTimeFormat = memoizeByLocale(
  (locale) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      // Numeric, not 2-digit: `vi` runs a 24 hour clock either way, but a
      // 2-digit hour pads `en` to "07:00 PM".
      hour: 'numeric',
      minute: '2-digit',
    }),
);

/**
 * Groups a whole VND amount: 200000 becomes "200.000" in `vi` and "200,000" in
 * `en`. The currency symbol lives in the locale files because it differs per
 * locale, so it is deliberately not appended here.
 */
export function formatVndAmount(amount: number, locale: string): string {
  return amountFormat(locale).format(amount);
}

/** Formats an ISO timestamp in the compact form used on cards: "15 thg 8". */
export function formatDayMonth(iso: string, locale: string): string {
  return dayMonthFormat(locale).format(new Date(iso));
}

/** Formats an ISO timestamp with the date and the time of day. */
export function formatDateTime(iso: string, locale: string): string {
  return dateTimeFormat(locale).format(new Date(iso));
}
