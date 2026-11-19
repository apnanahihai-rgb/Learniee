import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import { PLATFORM_TIMEZONE } from "@/lib/platformConfig";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";

/** Day label shared by the Requests rows: "Today", "Tomorrow" or "Thu, 5 Nov". */
function dayLabel(dateKey: string): string {
  const diff = Math.round(
    (Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${toDateKey(todayInPlatformTz())}T00:00:00Z`)) / 86_400_000,
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";

  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** A calendar date (stored as UTC midnight of the IST date) + "HH:mm" -> "Tomorrow, 4:00 PM". */
export function whenFromDate(isoDate: string, time: string | null | undefined): string {
  const label = dayLabel(isoDate.slice(0, 10));
  const t = formatScheduleTime(time);

  return t ? `${label}, ${t}` : label;
}

/** A real instant -> "Tomorrow, 4:00 PM" in the platform timezone (IST). */
export function whenFromInstant(iso: string): string {
  const d = new Date(iso);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: PLATFORM_TIMEZONE }).format(d);
  const time = d
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: PLATFORM_TIMEZONE })
    .toUpperCase();

  return `${dayLabel(key)}, ${time}`;
}
