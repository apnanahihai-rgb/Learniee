/**
 * Color mapping for a Complaint's status. Same extracted-util
 * pattern as `getLeaveRequestStatusStyle`/`getRescheduleStatusStyle`
 * — shared by `/parent/complain`, `/teacher/complain`, and
 * `/admin/complaints` instead of each page redefining its own map.
 */
export function getComplaintStatusStyle(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-amber-100 text-amber-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "CLOSED":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
