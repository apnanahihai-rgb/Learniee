import { SESSION_POLICY } from "@/lib/platformConfig";
import {
  addDays,
  addOneMonthClamped,
  compareDates,
  daysBetween,
  parseDateKey,
  toDateKey,
  weekdayOf,
  type CalendarDate,
} from "@/lib/platformTime";

/**
 * The cycle model (Part 1A): one cycle = one month, from the start
 * date to the same date next month minus one day (5 Mar -> 4 Apr).
 * The session count is however many of the parent's chosen weekdays
 * fall inside that window, and the price is session rate x count.
 *
 * Pure and shared: the booking screen previews with this, and the
 * server re-runs the exact same function to price the order, verify
 * the payment and generate the sessions — the client's preview is
 * never trusted for anything.
 */

export type PlanType = "MONTHLY" | "WEEKLY";

export function parsePlanType(value: unknown): PlanType {
  return value === "WEEKLY" ? "WEEKLY" : "MONTHLY";
}

export function minSessionsForPlan(planType: PlanType): number {
  return planType === "WEEKLY"
    ? SESSION_POLICY.minSessionsPerWeeklyCycle
    : SESSION_POLICY.minSessionsPerCycle;
}

export function cycleLabel(planType: PlanType): string {
  return planType === "WEEKLY" ? "week" : "month";
}

export interface CyclePlan {
  planType: PlanType;
  startDate: CalendarDate;
  /** Last day of the cycle (inclusive). */
  endDate: CalendarDate;
  /** Day after the cycle ends — the next cycle's start / the payment due date. */
  nextCycleStart: CalendarDate;
  /** Every matching date in the cycle, ascending — session N is index N-1. */
  sessionDates: CalendarDate[];
  sessionCount: number;
  /** Length of the cycle in days (start and end both inclusive). */
  cycleLengthDays: number;
  /**
   * True when the parent hand-picked the exact dates (`customDates`)
   * instead of a repeating weekly pattern.
   */
  isCustom: boolean;
  /** Custom dates that were malformed, duplicated-out-of-range or outside the cycle window. */
  invalidCustomDateCount: number;
}

export function buildCyclePlan(
  startDateKey: string,
  scheduleDays: number[],
  planType: PlanType = "MONTHLY",
  /**
   * Hand-picked dates ("YYYY-MM-DD", platform timezone). When
   * non-empty they ARE the sessions (and `scheduleDays` is ignored);
   * every date must fall inside the cycle window. Empty/omitted =
   * the repeating weekday pattern, exactly as before.
   */
  customDateKeys: readonly string[] = [],
): CyclePlan | null {
  const startDate = parseDateKey(startDateKey);

  if (!startDate) return null;

  // WEEKLY: 7 days, start date to start + 6. MONTHLY: same date next
  // month minus one day.
  const nextCycleStart =
    planType === "WEEKLY" ? addDays(startDate, 7) : addOneMonthClamped(startDate);
  const endDate = addDays(nextCycleStart, -1);
  const cycleLengthDays = daysBetween(startDate, endDate) + 1;
  const isCustom = customDateKeys.length > 0;

  const sessionDates: CalendarDate[] = [];
  let invalidCustomDateCount = 0;

  if (isCustom) {
    const seen = new Set<string>();

    for (const key of customDateKeys) {
      const date = parseDateKey(key);

      if (
        !date ||
        compareDates(date, startDate) < 0 ||
        compareDates(date, endDate) > 0
      ) {
        invalidCustomDateCount += 1;
        continue;
      }

      // The same date twice is one class, not two.
      const normalised = toDateKey(date);

      if (seen.has(normalised)) continue;

      seen.add(normalised);
      sessionDates.push(date);
    }

    sessionDates.sort(compareDates);
  } else {
    const daySet = new Set(scheduleDays);

    for (let i = 0; i < cycleLengthDays; i += 1) {
      const date = addDays(startDate, i);

      if (daySet.has(weekdayOf(date))) {
        sessionDates.push(date);
      }
    }
  }

  return {
    planType,
    startDate,
    endDate,
    nextCycleStart,
    sessionDates,
    sessionCount: sessionDates.length,
    cycleLengthDays,
    isCustom,
    invalidCustomDateCount,
  };
}

/** Distinct weekdays (0 = Sunday) of a set of date keys, ascending. Invalid keys are skipped. */
export function weekdaysOfDateKeys(keys: readonly string[]): number[] {
  const days = new Set<number>();

  for (const key of keys) {
    const date = parseDateKey(key);

    if (date) days.add(weekdayOf(date));
  }

  return Array.from(days).sort((a, b) => a - b);
}

/**
 * Cleans a client-supplied list of custom dates: strings only,
 * trimmed, valid "YYYY-MM-DD", de-duplicated, ascending. Anything
 * that isn't a list yields []. Range checks happen in
 * `buildCyclePlan` (it knows the window). Capped so a hostile body
 * can't send thousands of entries.
 */
export function normalizeCustomDateKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const keys = new Set<string>();

  for (const item of value.slice(0, 62)) {
    if (typeof item !== "string") continue;

    const date = parseDateKey(item.trim());

    if (date) keys.add(toDateKey(date));
  }

  return Array.from(keys).sort();
}

/**
 * Custom dates travel in a Razorpay order's `notes` as day offsets
 * from the cycle start (notes values are capped at 256 characters —
 * 31 full date strings wouldn't fit, 31 small numbers do).
 */
export function customDateOffsets(
  startDateKey: string,
  keys: readonly string[],
): number[] {
  const start = parseDateKey(startDateKey);

  if (!start) return [];

  const offsets: number[] = [];

  for (const key of keys) {
    const date = parseDateKey(key);

    if (date) offsets.push(daysBetween(start, date));
  }

  return offsets.sort((a, b) => a - b);
}

/** Inverse of `customDateOffsets`; ignores anything that isn't a whole number from 0 to 61. */
export function customDatesFromOffsets(
  startDateKey: string,
  offsets: unknown,
): string[] {
  const start = parseDateKey(startDateKey);

  if (!start || !Array.isArray(offsets)) return [];

  const keys = new Set<string>();

  for (const offset of offsets.slice(0, 62)) {
    if (Number.isInteger(offset) && offset >= 0 && offset <= 61) {
      keys.add(toDateKey(addDays(start, offset)));
    }
  }

  return Array.from(keys).sort();
}

/**
 * Moves a set of custom dates from one cycle start to another by the
 * same number of days (keeps the shape of the month: "day 1, 3, 8…").
 * Dates that would land outside the new window are dropped. Used as
 * the default for a renewal and when a Teacher moves the start date.
 */
export function shiftCustomDateKeys(
  keys: readonly string[],
  fromStartKey: string,
  toStartKey: string,
  planType: PlanType = "MONTHLY",
): string[] {
  const offsets = customDateOffsets(fromStartKey, keys);
  const target = buildCyclePlan(toStartKey, [], planType);

  if (!target) return [];

  return customDatesFromOffsets(toStartKey, offsets).filter((key) => {
    const date = parseDateKey(key);

    return !!date && compareDates(date, target.endDate) <= 0;
  });
}

/** Null if the plan is bookable, otherwise a message explaining why not. */
export function getCyclePlanProblem(plan: CyclePlan): string | null {
  const min = minSessionsForPlan(plan.planType);

  if (plan.invalidCustomDateCount > 0) {
    return `Some of the dates you picked are outside ${formatCycleRange(plan)} — pick dates inside that range.`;
  }

  if (plan.isCustom && plan.sessionCount < min) {
    return `You picked ${plan.sessionCount} date${
      plan.sessionCount === 1 ? "" : "s"
    } — a ${cycleLabel(plan.planType)} needs at least ${min} class dates between ${formatCycleRange(plan)}.`;
  }

  if (plan.sessionCount < min) {
    return `Your schedule only has ${plan.sessionCount} session${
      plan.sessionCount === 1 ? "" : "s"
    } between ${formatCycleRange(plan)} — a ${cycleLabel(plan.planType)} needs at least ${min}. Pick more class days or a different start date.`;
  }

  if (plan.sessionCount > plan.cycleLengthDays) {
    return `A cycle can't have more than ${plan.cycleLengthDays} sessions.`;
  }

  return null;
}

/**
 * The last calendar day a cycle's sessions can be held or moved to:
 * `SESSION_POLICY.completionWindowDays` (45) days after the cycle
 * start, counting the start date itself as day 1 — so a cycle
 * starting 5 Mar has day 45 on 18 Apr. Anything on or before that
 * date is inside the deadline.
 */
export function cycleDeadlineDate(cycleStart: CalendarDate): CalendarDate {
  return addDays(cycleStart, SESSION_POLICY.completionWindowDays - 1);
}

/**
 * Phase 2.2: the deadline for the make-up of an EXCUSED class — the
 * cycle's later `extendedDeadline` when it has one, else day 45.
 * Nothing else uses this; every other session stops at
 * `cycleDeadlineDate`.
 */
export function excusedMakeupDeadlineDate(
  cycleStart: CalendarDate,
  extendedDeadline: CalendarDate | null,
): CalendarDate {
  const base = cycleDeadlineDate(cycleStart);

  return extendedDeadline && compareDates(extendedDeadline, base) > 0 ? extendedDeadline : base;
}

/**
 * Phase 2.2: the extended deadline a leave gives a cycle — the later
 * of day 45 and the leave's last day, plus the configured extension.
 */
export function extendedDeadlineForLeave(
  cycleStart: CalendarDate,
  leaveEnd: CalendarDate,
): CalendarDate {
  const base = cycleDeadlineDate(cycleStart);
  const from = compareDates(leaveEnd, base) > 0 ? leaveEnd : base;

  return addDays(from, SESSION_POLICY.excusedMakeupExtensionDays);
}

/** True if a calendar date is on or before the cycle's deadline day. */
export function isWithinCycleDeadline(
  date: CalendarDate,
  cycleStart: CalendarDate,
): boolean {
  return compareDates(date, cycleDeadlineDate(cycleStart)) <= 0;
}

/** True if the cycle's start date is before `today` (both platform-timezone calendar dates). */
export function isStartDateInPast(startDate: CalendarDate, today: CalendarDate) {
  return compareDates(startDate, today) < 0;
}

/** Session rate x session count, rounded to paise. */
export function priceForSessions(ratePerSession: number, sessionCount: number) {
  return Math.round(ratePerSession * sessionCount * 100) / 100;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDayMonth(d: CalendarDate): string {
  return `${d.day} ${MONTH_LABELS[d.month - 1]}`;
}

/** "5 Mar to 4 Apr" */
export function formatCycleRange(plan: Pick<CyclePlan, "startDate" | "endDate">) {
  return `${formatDayMonth(plan.startDate)} to ${formatDayMonth(plan.endDate)}`;
}

/** "9 sessions, 5 Mar to 4 Apr" */
export function formatCycleSummary(plan: CyclePlan): string {
  return `${plan.sessionCount} session${
    plan.sessionCount === 1 ? "" : "s"
  }, ${formatCycleRange(plan)}`;
}
