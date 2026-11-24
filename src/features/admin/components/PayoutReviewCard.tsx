"use client";

import type { ReactNode } from "react";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import { AdminInitials } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminProps,
  AdminReviewCard,
} from "@/features/admin/components/ui/queue";
import type { AdminPayoutReviewEntry } from "@/features/admin/hooks/usePayoutReview";

export function formatPayoutRupees(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatPayoutDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  entry: AdminPayoutReviewEntry;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue. */
  waitingTag?: ReactNode;
  /** True while this payout's decision is being saved. */
  busy: boolean;
  onRelease: (id: string) => void;
  onReopen: (id: string) => void;
  onConfirmReject: (id: string) => void;
}

/** One held or rejected payout as a review card (Admin design 15). */
export default function PayoutReviewCard({
  entry,
  open,
  onToggle,
  waitingTag,
  busy,
  onRelease,
  onReopen,
  onConfirmReject,
}: Props) {
  const onHold = entry.payoutStatus === "ON_HOLD";
  const reason = onHold ? entry.holdReason : entry.rejectionReason;
  const pay = formatPayoutRupees(entry.monthlyTeacherPay);

  return (
    <AdminReviewCard
      id={`payout-${entry.id}`}
      open={open}
      onToggle={onToggle}
      lead={<AdminInitials name={entry.teacherName} />}
      title={entry.teacherName}
      meta={`${entry.parentName} · ${entry.childName} · ${entry.subject}`}
      keyLabel="Teacher pay"
      keyValue={pay}
      tags={
        <>
          {waitingTag}
          <span className={adminTag(onHold ? "amber" : "red")}>{onHold ? "On hold" : "Rejected"}</span>
        </>
      }
      footer={
        <AdminDecisionBar>
          <button type="button" disabled={busy} onClick={() => onConfirmReject(entry.id)} className={adminBtn("dtx")}>
            Confirm reject
          </button>
          <button type="button" disabled={busy} onClick={() => onReopen(entry.id)} className={adminBtn("out")}>
            Send back to Accounts
          </button>
          <button type="button" disabled={busy} onClick={() => onRelease(entry.id)} className={adminBtn("pri")}>
            {busy ? "Saving…" : "Release to payment"}
          </button>
        </AdminDecisionBar>
      }
    >
      <AdminProps
        items={[
          { label: "Cycle", value: `#${entry.cycleNumber}` },
          { label: "Teacher pay", value: pay, highlight: true },
          { label: "Completed", value: formatPayoutDate(entry.transactionDate) },
        ]}
      />

      {reason && (
        <AdminGoldNote title={onHold ? "Accounts’ hold reason" : "Accounts’ rejection reason"}>
          {reason}
        </AdminGoldNote>
      )}
    </AdminReviewCard>
  );
}
