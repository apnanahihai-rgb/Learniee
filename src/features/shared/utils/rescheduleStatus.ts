import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

/**
 * Display label for a reschedule request's status, from the
 * perspective of whichever role is looking at it — "Waiting on you"
 * vs "Waiting on <other party>" reads more usefully than the raw
 * enum on either side, same reasoning as Enrollment's parent-facing
 * status copy in enrollmentStatus.ts.
 */
export function getRescheduleStatusLabel(
  request: Pick<RescheduleRequestRow, "status">,
  viewerRole: "TEACHER" | "PARENT",
): string {
  switch (request.status) {
    case "PENDING_TEACHER_APPROVAL":
      return viewerRole === "TEACHER" ? "Waiting on your response" : "Waiting on teacher";
    case "PENDING_PARENT_APPROVAL":
      return viewerRole === "PARENT" ? "Waiting on your response" : "Waiting on parent";
    case "APPROVED":
      return "Approved — class moved";
    case "REJECTED":
      return "Declined";
    case "CANCELLED":
      return "Withdrawn";
    default:
      return request.status;
  }
}

export function getRescheduleStatusStyle(status: RescheduleRequestRow["status"]): string {
  switch (status) {
    case "PENDING_TEACHER_APPROVAL":
    case "PENDING_PARENT_APPROVAL":
      return "bg-amber-100 text-amber-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-600";
    case "CANCELLED":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/** Whether `viewerRole` is the one who needs to act on this request right now. */
export function isPendingOnViewer(
  request: Pick<RescheduleRequestRow, "status">,
  viewerRole: "TEACHER" | "PARENT",
): boolean {
  return (
    (viewerRole === "TEACHER" && request.status === "PENDING_TEACHER_APPROVAL") ||
    (viewerRole === "PARENT" && request.status === "PENDING_PARENT_APPROVAL")
  );
}

/** Whether `viewerRole` is the one who originally proposed this request (and so could withdraw it while pending). */
export function isProposedByViewer(
  request: Pick<RescheduleRequestRow, "requestedBy">,
  viewerRole: "TEACHER" | "PARENT",
): boolean {
  return request.requestedBy === viewerRole;
}
