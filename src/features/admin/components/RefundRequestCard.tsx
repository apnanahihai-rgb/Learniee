"use client";

import { useState, type ReactNode } from "react";

import { ADMIN_CONTROL, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import { AdminField, AdminInitials } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminProps,
  AdminQuote,
  AdminReviewCard,
  AdminText,
} from "@/features/admin/components/ui/queue";
import type { AdminRefundRequest } from "@/features/refunds/hooks/useRefundRequests";

const MIN_REJECT_NOTE = 5;

export function formatRefundRupees(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatRefundDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  request: AdminRefundRequest;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue (to-decide list only). */
  waitingTag?: ReactNode;
  /** True while this request's decision is being saved. */
  busy: boolean;
  /** Short message for the page toast (validation hints). */
  onNotify: (message: string) => void;
  onApprove: (id: string, amount: number, note?: string) => void;
  onReject: (id: string, note: string) => void;
}

/** One refund request as a review card (Admin design 14). */
export default function RefundRequestCard({
  request,
  open,
  onToggle,
  waitingTag,
  busy,
  onNotify,
  onApprove,
  onReject,
}: Props) {
  const [amount, setAmount] = useState(String(request.remainingRefundable));
  const [note, setNote] = useState("");
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [noteInvalid, setNoteInvalid] = useState(false);

  const pending = request.status === "PENDING";
  const paid = formatRefundRupees(request.amountPaid);
  const max = request.remainingRefundable;

  function approve() {
    const value = Number(amount);

    if (!(value > 0 && value <= max)) {
      setAmountInvalid(true);
      document.getElementById(`refund-amount-${request.id}`)?.focus();
      onNotify(`Enter an amount up to ${formatRefundRupees(max)}`);

      return;
    }

    onApprove(request.id, value, note.trim() || undefined);
  }

  function reject() {
    // The server needs a note the parent will see when a request is rejected.
    if (note.trim().length < MIN_REJECT_NOTE) {
      setNoteInvalid(true);
      document.getElementById(`refund-note-${request.id}`)?.focus();
      onNotify("Please add a note for the parent first");

      return;
    }

    onReject(request.id, note.trim());
  }

  const statusTag =
    request.status === "APPROVED" ? (
      <span className={adminTag("green")}>Approved</span>
    ) : request.status === "REJECTED" ? (
      <span className={adminTag("red")}>Rejected</span>
    ) : request.status === "CANCELLED" ? (
      <span className={adminTag("gray")}>Withdrawn</span>
    ) : (
      <span className={adminTag("amber")}>To decide</span>
    );

  const decidedProps = [
    ...(request.status === "APPROVED" && request.approvedAmount != null
      ? [{ label: "Credited to wallet", value: formatRefundRupees(request.approvedAmount), highlight: true }]
      : [{ label: "Amount paid", value: paid, highlight: true }]),
    {
      label: "Invoice",
      value: (
        <>
          {request.invoiceNumber}
          <small className="block text-xs font-normal text-pd-ink3">
            paid {formatRefundDate(request.paidAt)}
          </small>
        </>
      ),
    },
    ...(request.decidedAt
      ? [
          {
            label: "Decided",
            value: (
              <>
                {formatRefundDate(request.decidedAt)}
                {request.decidedByName && (
                  <small className="block text-xs font-normal text-pd-ink3">
                    by {request.decidedByName}
                  </small>
                )}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <AdminReviewCard
      id={`refund-${request.id}`}
      open={open}
      onToggle={onToggle}
      lead={<AdminInitials name={request.parentName} />}
      title={request.parentName}
      meta={`${request.parentEmail} · requested ${formatRefundDate(request.createdAt)}`}
      keyLabel="Amount paid"
      keyValue={paid}
      tags={
        <>
          {waitingTag}
          {statusTag}
        </>
      }
      footer={
        pending ? (
          <>
            <AdminField
              id={`refund-amount-${request.id}`}
              label="Refund amount"
              hint={`Up to ${formatRefundRupees(max)}.`}
              className="max-w-[360px] flex-[1_1_220px]"
            >
              <input
                id={`refund-amount-${request.id}`}
                type="number"
                inputMode="decimal"
                min={1}
                max={max}
                step="any"
                value={amount}
                disabled={busy}
                aria-invalid={amountInvalid || undefined}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setAmountInvalid(false);
                }}
                className={`${ADMIN_CONTROL} aria-[invalid=true]:border-pd-red`}
              />
            </AdminField>

            <AdminField
              id={`refund-note-${request.id}`}
              label="Note"
              optional
              hint="The parent sees this. Needed when you reject."
              className="max-w-[360px] flex-[1_1_220px]"
            >
              <input
                id={`refund-note-${request.id}`}
                type="text"
                value={note}
                maxLength={500}
                disabled={busy}
                aria-invalid={noteInvalid || undefined}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (event.target.value.trim().length >= MIN_REJECT_NOTE) setNoteInvalid(false);
                }}
                className={`${ADMIN_CONTROL} aria-[invalid=true]:border-pd-red`}
              />
            </AdminField>

            <AdminDecisionBar>
              <button type="button" disabled={busy} onClick={reject} className={adminBtn("dtx")}>
                Reject
              </button>
              <button type="button" disabled={busy} onClick={approve} className={adminBtn("pri")}>
                {busy ? "Saving…" : "Approve and credit wallet"}
              </button>
            </AdminDecisionBar>
          </>
        ) : undefined
      }
    >
      {pending ? (
        <AdminProps
          items={[
            { label: "Amount paid", value: paid, highlight: true },
            {
              label: "Invoice",
              value: (
                <>
                  {request.invoiceNumber}
                  <small className="block text-xs font-normal text-pd-ink3">
                    paid {formatRefundDate(request.paidAt)}
                  </small>
                </>
              ),
            },
          ]}
        />
      ) : (
        <AdminProps items={decidedProps} />
      )}

      <AdminQuote title="Reason given">{request.reason}</AdminQuote>

      {!pending && request.adminNote && (
        <AdminText title="Your note">
          <span className="whitespace-pre-wrap">{request.adminNote}</span>
        </AdminText>
      )}
    </AdminReviewCard>
  );
}
