/**
 * Whether a scheduled `ClassSession` occurrence is "live" right now
 * — i.e. whether the Join (Parent) / Start (Teacher) action should
 * be enabled. Session rows only carry a calendar date
 * (`scheduledDate`) and an optional wall-clock "HH:mm"
 * (`scheduledTime`) — there's no stored session length anywhere in
 * the schema (`Course.duration` is a free-text field, not minutes),
 * so a fixed window is used instead: enabled from
 * `JOIN_WINDOW_MINUTES_BEFORE` minutes before the scheduled time
 * through `JOIN_WINDOW_MINUTES_AFTER` minutes after it. Flagged as a
 * judgment call, same footing as other undocumented assumptions in
 * 06-OPEN-DECISIONS.md — confirm the actual class length with Aman
 * if this needs to be tighter/looser.
 *
 * If a session has no `scheduledTime` set at all (nullable field,
 * see 03-DATA-MODEL.md), there's nothing to match against — treated
 * as available any time on its scheduled date rather than blocking
 * it entirely.
 */

export const JOIN_WINDOW_MINUTES_BEFORE = 15;
export const JOIN_WINDOW_MINUTES_AFTER = 60;

/** "YYYY-MM-DD" for the local calendar date right now — same convention `ClassSession.scheduledDate`/`CalendarOccurrence.date` use. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * `date` is "YYYY-MM-DD", `time` is "HH:mm" or null
 * (`CalendarOccurrence.date`/`.time`). Only ever true for today's
 * date — a session on any other day, past or future, is never live.
 */
export function isSessionLive(
  date: string,
  time: string | null,
  now: Date = new Date(),
): boolean {
  if (date !== todayKey()) return false;

  if (!time) return true;

  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);

  if (Number.isNaN(h) || Number.isNaN(m)) return true;

  const scheduled = new Date(now);
  scheduled.setHours(h, m, 0, 0);

  const windowStart = new Date(scheduled.getTime() - JOIN_WINDOW_MINUTES_BEFORE * 60_000);
  const windowEnd = new Date(scheduled.getTime() + JOIN_WINDOW_MINUTES_AFTER * 60_000);

  return now >= windowStart && now <= windowEnd;
}
