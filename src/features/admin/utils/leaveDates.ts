const DAY = { day: "numeric", timeZone: "UTC" } as const;
const MONTH = { month: "short", timeZone: "UTC" } as const;
const YEAR = { year: "numeric", timeZone: "UTC" } as const;

/**
 * Leave dates are plain calendar dates (stored as UTC midnight), so they are
 * always formatted in UTC to read the same on every host and browser.
 * One day: "20 Nov 2026". Same month: "20–22 Nov 2026". Otherwise
 * "28 Nov – 2 Dec 2026" (years added when they differ).
 */
export function formatLeaveRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const f = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", o);
  const sameYear = f(start, YEAR) === f(end, YEAR);
  const sameMonth = sameYear && f(start, MONTH) === f(end, MONTH);
  const full = (d: Date) => `${f(d, DAY)} ${f(d, MONTH)} ${f(d, YEAR)}`;

  if (sameMonth && f(start, DAY) === f(end, DAY)) return full(start);
  if (sameMonth) return `${f(start, DAY)}–${f(end, DAY)} ${f(end, MONTH)} ${f(end, YEAR)}`;
  if (sameYear) return `${f(start, DAY)} ${f(start, MONTH)} – ${full(end)}`;

  return `${full(start)} – ${full(end)}`;
}

/** Single date, e.g. "20 Nov 2026" (for the long "Leave dates" line). */
export function formatLeaveDay(iso: string): string {
  const d = new Date(iso);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
