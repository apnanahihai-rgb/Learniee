"use client";

import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import { useTeacherRescheduleRequests } from "@/features/teacher/hooks/useRescheduleRequests";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";

/**
 * How many things are waiting for the Teacher's own answer — shown as a
 * badge on the sidebar's "Requests" item and on the Requests tabs. Built
 * from the same hooks the pages use, so the numbers always match.
 */
export function useTeacherRequestCount() {
  const { enrollments } = useTeacherEnrollments();
  const { requests } = useTeacherRescheduleRequests();

  const pendingEnrollments = enrollments.filter(
    (e) => e.status === "PENDING_TEACHER_APPROVAL",
  ).length;
  const pendingReschedules = requests.filter((r) =>
    isPendingOnViewer(r, "TEACHER"),
  ).length;

  return {
    enrollments: pendingEnrollments,
    reschedules: pendingReschedules,
    total: pendingEnrollments + pendingReschedules,
  };
}
