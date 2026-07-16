/**
 * Groups a whole VND amount with dots, the Vietnamese thousands separator:
 * 200000 becomes "200.000". The currency symbol lives in the locale files
 * because it differs per locale, so it is deliberately not appended here.
 */
export function formatVndAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Formats an ISO timestamp as "15/08", the compact form used on cards. */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** Formats an ISO timestamp as "15/08/2026 · 19:00". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  return `${day} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
