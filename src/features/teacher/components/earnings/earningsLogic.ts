import type {
  LedgerPayoutStatusView,
  PayoutRecordStatusView,
  TeacherEarningsLedgerEntry,
} from "@/features/teacher/hooks/useTeacherEarnings";
// "On the way" is defined once, shared with the Home earnings card.
import { isOnTheWayStatus } from "@/features/shared/utils/teacherEarnings";

export type EarningsTone = "amber" | "green" | "violet" | "red" | "gray";

/** Status label + tag colour for one ledger row (design: Paid / Processing / Queued, plus the review states). */
export const LEDGER_STATUS: Record<LedgerPayoutStatusView, { label: string; tone: EarningsTone }> = {
  PAID: { label: "Paid", tone: "green" },
  PROCESSING: { label: "Processing", tone: "violet" },
  QUEUED_FOR_PAYMENT: { label: "Queued", tone: "amber" },
  APPROVED: { label: "Queued", tone: "amber" },
  PENDING_VERIFICATION: { label: "In review", tone: "gray" },
  EXPIRED: { label: "In review", tone: "gray" },
  ON_HOLD: { label: "On hold", tone: "amber" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export const RECORD_STATUS: Record<PayoutRecordStatusView, { label: string; tone: EarningsTone }> = {
  SUCCESS: { label: "Paid", tone: "green" },
  PROCESSING: { label: "Processing", tone: "violet" },
  SKIPPED_NO_BANK_ACCOUNT: { label: "Skipped", tone: "amber" },
  FAILED: { label: "Failed", tone: "red" },
};

export function summariseEarnings(entries: TeacherEarningsLedgerEntry[]) {
  let paid = 0;
  let onTheWay = 0;

  for (const e of entries) {
    if (e.payoutStatus === "PAID") paid += e.monthlyTeacherPay;
    else if (isOnTheWayStatus(e.payoutStatus)) onTheWay += e.monthlyTeacherPay;
  }

  return { paid, onTheWay };
}

export const formatInr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const formatPayoutDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The detail line shown under a status tag, when Admin/Accounts left a reason. */
export function ledgerReason(e: TeacherEarningsLedgerEntry): string | null {
  if (e.payoutStatus === "ON_HOLD") return e.holdReason;
  if (e.payoutStatus === "REJECTED") return e.rejectionReason;

  return null;
}

/** "•••• •••• 4821" — the account number is never shown in full. */
export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  return `•••• •••• ${digits.slice(-4)}`;
}
