import { PLATFORM_TIMEZONE } from "@/lib/platformConfig";

/** Whole-rupee amounts: KPI tiles, table totals, chart legends. */
export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Paise-accurate amounts: wallet balances, invoices. */
export const currencyExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

// Fixed to the platform timezone (IST) so server render and browser agree,
// whatever the host or viewer timezone is.
const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: PLATFORM_TIMEZONE,
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
}

/** "PENDING_VERIFICATION" -> "Pending verification". */
export function humanizeEnum(value: string): string {
  const spaced = value.replaceAll("_", " ").toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const EXPORT_HREF = "/api/accounts/export";
