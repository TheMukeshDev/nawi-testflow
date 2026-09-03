/**
 * NAWI TestFlow — Date helpers.
 *
 * Single source of truth for default date/time values in forms:
 * - All form date fields default to the current date (editable via native
 *   date pickers, submitted as yyyy-mm-dd).
 * - Validity/expiry dates default to +1 year from today.
 * - Display formatting is en-GB (DD Mon YYYY) — see usages of
 *   `formatDisplayDate` for read-only views.
 */

/** Today's date as yyyy-mm-dd (native `<input type="date">` value format). */
export function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date N days from today as yyyy-mm-dd. */
export function plusDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Date N years from today as yyyy-mm-dd (for validity / next-calibration). */
export function plusYearsISO(years: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return todayISO(d);
}

/** Current time as HH:MM (native `<input type="time">` value format). */
export function nowTimeHM(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Read-only display format: 03 Sep 2026 (empty/invalid → em dash). */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
