import { ClassSessionError, markNextDueSessionComplete } from "@/features/shared/server/classSession.service";

/**
 * Thin backward-compatible wrapper kept for
 * `/api/teacher/enrollments/[id]/mark-session` (the original
 * one-click "Mark session complete" button). The actual logic now
 * lives in `classSession.service.ts` — sessions are real, dated
 * `ClassSession` rows generated from the enrollment's schedule, not
 * a blind counter increment with no date behind it. See that file's
 * header for the full rationale, including how cycle completion
 * still writes a `TuitionLedgerEntry` (the Account Ledger commit's
 * behavior, now preserved inside `recomputeEnrollmentCounters`).
 *
 * `CycleProgressError` is re-exported (not re-declared) so
 * `error instanceof CycleProgressError` in the existing route still
 * works unchanged.
 */
export const CycleProgressError = ClassSessionError;

export async function markSessionCompleted(
  enrollmentId: string,
  teacherId: string,
) {
  return markNextDueSessionComplete(enrollmentId, teacherId);
}
