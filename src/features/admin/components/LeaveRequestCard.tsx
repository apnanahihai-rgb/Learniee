"use client";

import { useState, type ReactNode } from "react";

import { ADMIN_CONTROL, adminBtn, adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import { AdminField, AdminInitials } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminProps,
  AdminReviewCard,
} from "@/features/admin/components/ui/queue";
import type { AdminLeaveRequest } from "@/features/admin/hooks/useLeaveRequests";
import { formatLeaveDay, formatLeaveRange } from "@/features/admin/utils/leaveDates";
import { displayName } from "@/features/shared/utils/displayName";

interface Props {
  request: AdminLeaveRequest;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue (pending list only). */
  waitingTag?: ReactNode;
  /** True while this request's decision is being saved. */
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

const STATUS: Record<AdminLeaveRequest["status"], { label: string; color: AdminTagColor }> = {
  PENDING: { label: "Pending", color: "amber" },
  APPROVED: { label: "Approved", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
  CANCELLED: { label: "Cancelled", color: "gray" },
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** What approving would do to the teacher's classes ("If approved" note). */
function ImpactText({ impact }: { impact: NonNullable<AdminLeaveRequest["impact"]> }) {
  return (
    <>
      {plural(impact.moving, "class", "classes")} will move to {impact.moving === 1 ? "a new slot" : "new slots"}
      {impact.excused > 0 && (
        <>
          ; <b>{impact.excused}</b> will be excused (no free slot in the 45-day window, a make-up is
          looked for after the leave)
        </>
      )}
      {impact.tooSoon > 0 && (
        <>
          ; {impact.tooSoon} starting in under 4 hours can&apos;t be moved (normal teacher cancel rules
          apply)
        </>
      )}
      .
    </>
  );
}

/** One teacher leave request as a review card (Admin design 09). */
export default function LeaveRequestCard({
  request,
  open,
  onToggle,
  waitingTag,
  busy,
  onApprove,
  onReject,
}: Props) {
  const [reason, setReason] = useState("");

  const name = displayName(request.teacher);
  const pending = request.status === "PENDING";
  const status = STATUS[request.status] ?? STATUS.CANCELLED;

  return (
    <AdminReviewCard
      id={`leave-${request.id}`}
      open={open}
      onToggle={onToggle}
      lead={<AdminInitials name={name} />}
      title={name}
      meta={request.teacher.email}
      keyLabel="Leave"
      keyValue={formatLeaveRange(request.startDate, request.endDate)}
      tags={
        <>
          {waitingTag}
          {request.isEmergency && <span className={adminTag("red")}>Emergency</span>}
          <span className={adminTag(status.color)}>{status.label}</span>
        </>
      }
      footer={
        pending ? (
          <>
            <AdminField
              id={`leave-reject-${request.id}`}
              label="Reason for rejecting"
              optional
              className="max-w-[360px] flex-[1_1_220px]"
            >
              <input
                id={`leave-reject-${request.id}`}
                type="text"
                value={reason}
                maxLength={500}
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
                className={ADMIN_CONTROL}
              />
            </AdminField>

            <AdminDecisionBar>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(request.id, reason.trim() || undefined)}
                className={adminBtn("dtx")}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(request.id)}
                className={adminBtn("pri")}
              >
                {busy ? "Saving…" : "Approve leave"}
              </button>
            </AdminDecisionBar>
          </>
        ) : undefined
      }
    >
      <AdminProps
        items={[
          {
            label: "Leave dates",
            value: `${formatLeaveDay(request.startDate)} – ${formatLeaveDay(request.endDate)}`,
            wide: true,
          },
          { label: "Reason", value: request.reason, wide: true },
          ...(!pending && request.adminNote
            ? [{ label: "Your note", value: request.adminNote, wide: true }]
            : []),
        ]}
      />

      {pending && request.impact && (
        <AdminGoldNote title="If approved">
          <ImpactText impact={request.impact} />
        </AdminGoldNote>
      )}
    </AdminReviewCard>
  );
}
