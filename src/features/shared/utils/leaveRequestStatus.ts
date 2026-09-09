/**
 * Color mapping for a LeaveRequest's status. Extracted from an
 * identical `STATUS_STYLES` object that was duplicated verbatim in
 * both `/teacher/leave` and `/admin/leave-requests` — same pattern
 * as `getRescheduleStatusStyle` in `rescheduleStatus.ts`.
 *
 * Display *labels* stay local to each page on purpose: Teacher shows
 * a friendlier "Awaiting admin"/"Withdrawn" copy, Admin shows the
 * raw status — the same role-aware-copy convention used elsewhere
 * in this codebase, not something to collapse into one shared label.
 */
export function getLeaveRequestStatusStyle(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
