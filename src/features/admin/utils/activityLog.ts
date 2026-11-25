import { PLATFORM_TIMEZONE } from "@/lib/platformConfig";
import type { AdminTagColor } from "@/features/admin/components/ui/adminStyles";

/**
 * Display helpers for the Admin Activity log (design 24). Kept apart from
 * the page so the rules are easy to find and reuse.
 */

export const ACTOR_ROLE_LABELS: Record<string, string> = {
  PARENT: "Parent",
  TEACHER: "Teacher",
  ADMIN: "Admin",
  ACCOUNTS: "Accounts",
  HR: "HR",
  IT: "IT",
  SYSTEM: "System",
};

export function actorRoleLabel(role: string) {
  return ACTOR_ROLE_LABELS[role] ?? role;
}

/** Rejections, failures and deletions stand out in red; everything else is violet. */
export function activityTagColor(action: string): AdminTagColor {
  return /REJECTED|FAILED|DELETED/.test(action) ? "red" : "violet";
}

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: PLATFORM_TIMEZONE,
});

/** "20 Nov 2026, 10:12" in platform time (IST), whatever the browser's timezone. */
export function formatActivityDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}
