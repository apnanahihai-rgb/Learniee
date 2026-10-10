import { SESSION_POLICY } from "@/lib/platformConfig";
import { compareDates, todayInPlatformTz, type CalendarDate } from "@/lib/platformTime";
import { excusedMakeupDeadlineDate } from "@/features/shared/utils/cyclePlan";
import {
  isSessionSettled,
  sessionOutcomeCounts,
  type SessionStatusValue,
} from "@/features/shared/utils/sessionOutcome";

/**
 * When a cycle closes (Part 1C §4) and what its totals are. Pure.
 *
 * A cycle closes when either
 *   - every session is settled (no SCHEDULED / NEEDS_REVIEW session,
 *     and every no-show / teacher cancel has had its follow-up), or
 *   - day 45 of the cycle has passed, whatever is left unfinished
 *     (day 45 is pushed out only while an excused class's make-up can
 *     still be placed, Phase 2.2).
 *
 * Whatever did not count is forfeited: no refund, no teacher pay.
 */

export interface CloseCheckSession {
  status: SessionStatusValue;
  cancelledByRole: string | null;
  followUpAppliedAt: Date | null;
  endsAt: Date | null;
  /** Phase 2.3: true when an excused class got a make-up (only read for EXCUSED). */
  hasMakeup?: boolean;
}

/**
 * Phase 2.3: counted / forfeited / excused totals for a cycle. Pure.
 * An EXCUSED class with no make-up is dropped: it is neither counted
 * nor forfeited, so it comes off the paid count before the forfeit
 * sum. An excused class WITH a make-up is replaced by it, and the
 * make-up counts (or is forfeited) like any other class.
 */
export function cycleTotals(
  sessions: Pick<CloseCheckSession, "status" | "hasMakeup">[],
  sessionCount: number,
): { counted: number; forfeited: number; excused: number } {
  const excused = sessions.filter((s) => s.status === "EXCUSED" && !s.hasMakeup).length;
  const payable = Math.max(0, sessionCount - excused);
  const counted = Math.min(
    sessions.filter((s) => sessionOutcomeCounts(s.status) === true).length,
    payable,
  );

  return { counted, forfeited: Math.max(0, payable - counted), excused };
}

export type CycleCloseDecision =
  | { close: false }
  | {
      close: true;
      reason: "ALL_SESSIONS_FINAL" | "WINDOW_ENDED";
      /** Sessions that counted (paid), never above the paid session count. */
      countedSessions: number;
      /** Paid-for sessions that never counted (excused classes excluded). */
      forfeitedSessions: number;
      /** Excused classes that got no make-up (Phase 2.3). */
      excusedSessions: number;
    };

export function decideCycleClose(input: {
  sessions: CloseCheckSession[];
  /** The cycle's paid session count. */
  sessionCount: number;
  cycleStart: CalendarDate;
  /** Phase 2.2: the cycle's extended deadline, if leave excused a class. */
  extendedDeadline?: CalendarDate | null;
  now: Date;
}): CycleCloseDecision {
  const { sessions, sessionCount, cycleStart, now } = input;

  if (sessions.length === 0) return { close: false };

  const allSettled = sessions.every((s) => isSessionSettled(s));

  let reason: "ALL_SESSIONS_FINAL" | "WINDOW_ENDED" | null = null;

  if (allSettled) {
    reason = "ALL_SESSIONS_FINAL";
  } else if (compareDates(
      todayInPlatformTz(now),
      excusedMakeupDeadlineDate(cycleStart, input.extendedDeadline ?? null),
    ) > 0) {
    // Day 45 is over. Give a session that only just ended one sweep
    // delay to be resolved first, so a day-45 late-evening class isn't
    // forfeited for being a few minutes behind.
    const settleAfter = now.getTime() - SESSION_POLICY.sweepDelayMinutes * 60_000;
    const stillResolving = sessions.some(
      (s) => s.status === "SCHEDULED" && (s.endsAt === null || s.endsAt.getTime() > settleAfter),
    );

    if (!stillResolving) reason = "WINDOW_ENDED";
  }

  if (!reason) return { close: false };

  const totals = cycleTotals(sessions, sessionCount);

  return {
    close: true,
    reason,
    countedSessions: totals.counted,
    forfeitedSessions: totals.forfeited,
    excusedSessions: totals.excused,
  };
}
