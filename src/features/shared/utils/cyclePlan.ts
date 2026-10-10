import { SESSION_POLICY } from "@/lib/platformConfig";
import {
  addDays,
  addOneMonthClamped,
  compareDates,
  daysBetween,
  parseDateKey,
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
}

export function buildCyclePlan(
  startDateKey: string,
  scheduleDays: number[],
  planType: PlanType = "MONTHLY",
): CyclePlan | null {
  const startDate = parseDateKey(startDateKey);

  if (!startDate) return null;

  // WEEKLY: 7 days, start date to start + 6. MONTHLY: same date next
  // month minus one day.
  const nextCycleStart =
    planType === "WEEKLY" ? addDays(startDate, 7) : addOneMonthClamped(startDate);
  const endDate = addDays(nextCycleStart, -1);
  const cycleLengthDays = daysBetween(startDate, endDate) + 1;
  const daySet = new Set(scheduleDays);

  const sessionDates: CalendarDate[] = [];

  for (let i = 0; i < cycleLengthDays; i += 1) {
    const date = addDays(startDate, i);

    if (daySet.has(weekdayOf(date))) {
      sessionDates.push(date);
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
  };
}

/** Null if the plan is bookable, otherwise a message explaining why not. */
export function getCyclePlanProblem(plan: CyclePlan): string | null {
  const min = minSessionsForPlan(plan.planType);

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
