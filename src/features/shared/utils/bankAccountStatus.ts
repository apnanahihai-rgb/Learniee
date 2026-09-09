/**
 * Color mapping for a BankAccount's approval status (Bank Account
 * Approval, Sep 10, 2026) — same extracted-util pattern as
 * `getLeaveRequestStatusStyle`/`getRescheduleStatusStyle`.
 */
export function getBankAccountStatusStyle(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
