"use client";

import { useState, type ReactNode } from "react";

import type { AdminBankAccount } from "@/features/admin/hooks/useBankAccounts";
import { ADMIN_CONTROL, adminBtn, adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import { AdminField, AdminInitials } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminProps,
  AdminReviewCard,
  AdminText,
} from "@/features/admin/components/ui/queue";

interface Props {
  account: AdminBankAccount;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue. */
  waitingTag?: ReactNode;
  /** True while this account's decision is being saved. */
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

const STATUS: Record<AdminBankAccount["status"], { label: string; color: AdminTagColor }> = {
  PENDING: { label: "Pending", color: "amber" },
  APPROVED: { label: "Approved", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

// Shows only the last 4 digits. The stored value is still plain text
// (06-OPEN-DECISIONS.md #47), so the list never needs to display it.
function maskAccountNumber(accountNumber: string) {
  return accountNumber.length <= 4 ? accountNumber : `XXXXXX${accountNumber.slice(-4)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One teacher bank submission as a review card (Admin design 05). Pending ones get the decision footer. */
export default function BankAccountCard({
  account,
  open,
  onToggle,
  waitingTag,
  busy,
  onApprove,
  onReject,
}: Props) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);

  const status = STATUS[account.status];
  const pending = account.status === "PENDING";
  const reasonId = `bank-reason-${account.id}`;
  const bank = account.bankName
    ? `${account.bankName}${account.branchName ? `, ${account.branchName}` : ""}`
    : "-";

  function handleReject() {
    if (!reason.trim()) {
      setInvalid(true);
      document.getElementById(reasonId)?.focus();

      return;
    }

    onReject(account.id, reason.trim());
  }

  return (
    <AdminReviewCard
      id={`bank-${account.id}`}
      open={open}
      onToggle={onToggle}
      lead={<AdminInitials name={account.teacherName} />}
      title={account.teacherName}
      meta={`${account.email} · Submitted ${formatDate(account.createdAt)}`}
      tags={
        <>
          {pending && waitingTag}
          <span className={adminTag(status.color)}>{status.label}</span>
        </>
      }
      footer={
        pending ? (
          <>
            <AdminField
              id={reasonId}
              label="Reason for rejecting"
              hint="Required to reject these bank details."
              className="max-w-[360px] flex-[1_1_220px]"
            >
              <input
                id={reasonId}
                type="text"
                value={reason}
                maxLength={500}
                disabled={busy}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (event.target.value.trim()) setInvalid(false);
                }}
                className={`${ADMIN_CONTROL} aria-[invalid=true]:border-pd-red`}
              />
              {invalid && (
                <span role="alert" className="text-xs font-semibold text-pd-red">
                  Please add a reason first.
                </span>
              )}
            </AdminField>

            <AdminDecisionBar>
              <button type="button" disabled={busy} onClick={handleReject} className={adminBtn("dtx")}>
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(account.id)}
                className={adminBtn("pri")}
              >
                {busy ? "Saving…" : "Approve"}
              </button>
            </AdminDecisionBar>
          </>
        ) : undefined
      }
    >
      <AdminProps
        items={[
          { label: "Account holder", value: account.accountHolderName },
          { label: "Account number", value: maskAccountNumber(account.accountNumber) },
          { label: "IFSC", value: account.ifscCode },
          { label: "Bank", value: bank },
          ...(account.reviewedAt
            ? [{ label: "Reviewed", value: formatDate(account.reviewedAt) }]
            : []),
        ]}
      />

      {account.rejectionReason && (
        <AdminText title="Rejection reason">{account.rejectionReason}</AdminText>
      )}
    </AdminReviewCard>
  );
}
