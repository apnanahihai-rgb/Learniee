import { addDays, compareDates, todayInPlatformTz } from "@/lib/platformTime";

export type TablePeriod = "all" | "this_month" | "last_30_days";

export const TABLE_PERIOD_OPTIONS: { value: TablePeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_30_days", label: "Last 30 days" },
];

/**
 * Client-side period filter for the dashboard tables. Dates are compared as
 * platform-timezone (IST) calendar days, the same rule the rest of the app uses.
 */
export function matchesPeriod(value: Date | string, period: TablePeriod): boolean {
  if (period === "all") return true;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const today = todayInPlatformTz();
  const day = todayInPlatformTz(date);

  if (period === "this_month") {
    return day.year === today.year && day.month === today.month;
  }

  const from = addDays(today, -29);

  return compareDates(day, from) >= 0 && compareDates(day, today) <= 0;
}

/** Case-insensitive "does any field contain the query" check. */
export function matchesQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();

  if (!q) return true;

  return fields.some((field) => (field ?? "").toLowerCase().includes(q));
}
