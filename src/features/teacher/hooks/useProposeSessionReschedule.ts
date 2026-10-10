"use client";

import { useState } from "react";

export interface ProposeRescheduleInput {
  proposedDate: string;
  proposedTime?: string;
  reason?: string;
}

export interface ProposeRescheduleResult {
  /** True when the class was cancelled instead (late reschedule, Phase 2.4). */
  cancelled: boolean;
}

/**
 * Teacher-side: propose moving one scheduled class to a new date/time.
 *
 * Phase 2.4: a class under 4 hours away can't be rescheduled — the
 * server answers `LATE_TEACHER_RESCHEDULE`, `needsLateConfirm` turns
 * true, and calling `submit(input, { confirmLateCancel: true })`
 * cancels the class instead (with a strike).
 */
export function useProposeSessionReschedule(sessionId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsLateConfirm, setNeedsLateConfirm] = useState(false);

  async function submit(
    input: ProposeRescheduleInput,
    options: { confirmLateCancel?: boolean } = {},
  ): Promise<ProposeRescheduleResult | null> {
    try {
      setSubmitting(true);
      setError("");
      setNeedsLateConfirm(false);

      const res = await fetch(`/api/teacher/class-sessions/${sessionId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, confirmLateCancel: options.confirmLateCancel === true }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LATE_TEACHER_RESCHEDULE") setNeedsLateConfirm(true);

        throw new Error(data.error || "Failed to submit the reschedule request.");
      }

      return { cancelled: data.cancelled === true };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit the reschedule request.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error, needsLateConfirm };
}
