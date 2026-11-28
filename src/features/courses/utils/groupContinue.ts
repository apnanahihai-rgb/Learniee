/**
 * Group classes (Dec 2026) — "continue?" for recurring groups. Pure helpers
 * shared by the server service and the Teacher screens.
 *
 * A recurring group runs in batches (the students' current cycle). Before a
 * batch ends the Teacher must say whether the group continues:
 *  - asked 10 days before a monthly batch ends, or after week 2 of a weekly
 *    group's batch (always early enough to be before the deadline below);
 *  - the answer is required before the 4th-last class of the batch, which
 *    can't be started until then.
 */

import {
  addDays,
  compareDates,
  parseDateKey,
  toDateKey,
  type CalendarDate,
} from "@/lib/platformTime";

import { GROUP_MIN_CLASSES_LEFT, groupClassDateKeys, type GroupRecurrence } from "./groupClass";

/** Monthly batch: the Teacher is asked this many days before it ends. */
export const GROUP_CONTINUE_ASK_DAYS_BEFORE_END = 10;
/** Weekly group: the Teacher is asked once this many days of the batch have passed (after week 2). */
export const GROUP_CONTINUE_ASK_AFTER_DAYS = 14;
/** The prompt always comes at least this many days before the 4th-last class. */
export const GROUP_CONTINUE_MIN_LEAD_DAYS = 2;
/** "Remind me later" snoozes for this long (hours). */
export const GROUP_CONTINUE_SNOOZE_HOURS = 24;

export type GroupContinueAction = "CONTINUE" | "CLOSE" | "LATER";

export function isGroupContinueAction(value: unknown): value is GroupContinueAction {
  return value === "CONTINUE" || value === "CLOSE" || value === "LATER";
}

/**
 * Date ("YYYY-MM-DD") of the 4th-last class of a batch — the first class that
 * can't be held until the Teacher has answered. A batch with 4 classes or
 * fewer is blocked from its first class. Null when the batch has no class.
 */
export function fourthLastClassKey(
  days: readonly number[],
  batchStartKey: string,
  batchEndKey: string,
): string | null {
  const classes = groupClassDateKeys(days, batchStartKey, batchEndKey);

  if (classes.length === 0) return null;

  return classes[Math.max(0, classes.length - GROUP_MIN_CLASSES_LEFT)];
}

/**
 * First day the Teacher is asked: the spec date (monthly: 10 days before the
 * batch ends; weekly: day 14 of the batch), pulled earlier when it would leave
 * less than `GROUP_CONTINUE_MIN_LEAD_DAYS` before the 4th-last class, and never
 * before the batch starts.
 */
export function continueAskFromKey(input: {
  recurrence: GroupRecurrence | null | undefined;
  batchStartKey: string;
  batchEndKey: string;
  mustAnswerKey: string;
}): string {
  const start = parseDateKey(input.batchStartKey);
  const end = parseDateKey(input.batchEndKey);
  const must = parseDateKey(input.mustAnswerKey);

  if (!start || !end || !must) return input.batchStartKey;

  const spec: CalendarDate =
    input.recurrence === "WEEKLY"
      ? addDays(start, GROUP_CONTINUE_ASK_AFTER_DAYS)
      : addDays(end, -GROUP_CONTINUE_ASK_DAYS_BEFORE_END);

  const latest = addDays(must, -GROUP_CONTINUE_MIN_LEAD_DAYS);
  let ask = compareDates(spec, latest) <= 0 ? spec : latest;

  if (compareDates(ask, start) < 0) ask = start;

  return toDateKey(ask);
}

/**
 * When "remind me later" should ring again: a day from now, but never later
 * than 6 hours before the deadline (and not sooner than an hour from now).
 */
export function nextReminderAt(now: Date, mustAnswerBy: Date): Date {
  const snooze = new Date(now.getTime() + GROUP_CONTINUE_SNOOZE_HOURS * 3_600_000);
  const beforeDeadline = new Date(mustAnswerBy.getTime() - 6 * 3_600_000);
  const soonest = new Date(now.getTime() + 3_600_000);
  const wanted = snooze < beforeDeadline ? snooze : beforeDeadline;

  return wanted < soonest ? soonest : wanted;
}

/** Plain-English wording of the two "can't continue" states, shared by Parent and Teacher screens. */
export const GROUP_HOLD_MESSAGES = {
  WAITING_TEACHER:
    "Renewal opens as soon as the teacher confirms the group is continuing. You'll be notified — current families get the first chance.",
  CLOSING:
    "This group is closing and won't run another cycle, so there is nothing to renew.",
} as const;

export type GroupHoldState = keyof typeof GROUP_HOLD_MESSAGES;
