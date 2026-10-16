import { INTERVIEW_POLICY } from "@/lib/platformConfig";

export type InterviewJoinState = "NO_INTERVIEW" | "NOT_YET" | "OPEN" | "CLOSED";

export interface InterviewJoinWindow {
  state: InterviewJoinState;
  /** When the Meet link unlocks (10 min before the interview). */
  opensAt: Date | null;
  /** When it locks again. */
  closesAt: Date | null;
}

/**
 * When a teacher interview's Meet link is usable. Pure (no clock, no
 * database) so the server and both screens share exactly one rule; the
 * server re-checks it on every join.
 */
export function getInterviewJoinWindow(
  scheduledAt: Date | string | null | undefined,
  now: Date,
): InterviewJoinWindow {
  const scheduled = scheduledAt ? new Date(scheduledAt) : null;

  if (!scheduled || Number.isNaN(scheduled.getTime())) {
    return { state: "NO_INTERVIEW", opensAt: null, closesAt: null };
  }

  const opensAt = new Date(
    scheduled.getTime() - INTERVIEW_POLICY.joinOpensMinutesBefore * 60_000,
  );
  const closesAt = new Date(
    scheduled.getTime() + INTERVIEW_POLICY.joinClosesMinutesAfter * 60_000,
  );

  if (now.getTime() < opensAt.getTime()) return { state: "NOT_YET", opensAt, closesAt };
  if (now.getTime() >= closesAt.getTime()) return { state: "CLOSED", opensAt, closesAt };

  return { state: "OPEN", opensAt, closesAt };
}
