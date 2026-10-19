import { DEMO_POLICY } from "@/lib/platformConfig";

export type DemoJoinState = "NO_DEMO" | "NOT_YET" | "OPEN" | "CLOSED";

export interface DemoJoinWindow {
  state: DemoJoinState;
  /** When the Meet link unlocks (10 min before the demo). */
  opensAt: Date | null;
  /** When it locks again (scheduled end + grace). */
  closesAt: Date | null;
}

/**
 * When a demo's Meet link is usable. Pure (no clock, no database) so the
 * server and both screens share exactly one rule; the server re-checks it
 * on every join.
 */
export function getDemoJoinWindow(
  scheduledAt: Date | string | null | undefined,
  lengthMinutes: number,
  now: Date,
): DemoJoinWindow {
  const scheduled = scheduledAt ? new Date(scheduledAt) : null;

  if (!scheduled || Number.isNaN(scheduled.getTime())) {
    return { state: "NO_DEMO", opensAt: null, closesAt: null };
  }

  const opensAt = new Date(scheduled.getTime() - DEMO_POLICY.joinOpensMinutesBefore * 60_000);
  const closesAt = new Date(
    scheduled.getTime() + (lengthMinutes + DEMO_POLICY.joinClosesMinutesAfterEnd) * 60_000,
  );

  if (now.getTime() < opensAt.getTime()) return { state: "NOT_YET", opensAt, closesAt };
  if (now.getTime() >= closesAt.getTime()) return { state: "CLOSED", opensAt, closesAt };

  return { state: "OPEN", opensAt, closesAt };
}
