"use client";

import { useState } from "react";

export interface ProposeRescheduleInput {
  proposedDate: string;
  proposedTime?: string;
  reason?: string;
}

/** Parent-side: propose moving one scheduled class to a new date/time. */
export function useProposeSessionReschedule(sessionId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(input: ProposeRescheduleInput) {
    try {
      setSubmitting(true);
      setError("");

      const res = await fetch(`/api/parent/class-sessions/${sessionId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit the reschedule request.");
      }

      return data.request;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit the reschedule request.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error };
}
