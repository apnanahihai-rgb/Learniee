"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import type { AdminEnrollment } from "@/features/admin/hooks/useEnrollments";
import { ADMIN_CONTROL, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import { AdminField } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminGroup,
  AdminProps,
  AdminReviewCard,
  AdminTwoCols,
} from "@/features/admin/components/ui/queue";

interface Props {
  enrollment: AdminEnrollment;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue. */
  waitingTag?: ReactNode;
  /** True while this enrollment's decision is being saved. */
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

function displayName(p: { firstName: string; lastName: string; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

export function formatRupees(value: string | number): string {
  const amount = Number(value);

  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : "-";
}

/** One enrollment waiting for the final Admin approval, as a review card (Admin design 04). */
export default function EnrollmentApprovalCard({
  enrollment,
  open,
  onToggle,
  waitingTag,
  busy,
  onApprove,
  onReject,
}: Props) {
  const [reason, setReason] = useState("");

  const parent = displayName(enrollment.parent);
  const teacher = displayName(enrollment.teacher);
  const child = enrollment.student.visibleName || enrollment.student.firstName;
  const paid = formatRupees(enrollment.amountPaid);
  const start = new Date(enrollment.cycleStartDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <AdminReviewCard
      id={`enrollment-${enrollment.id}`}
      open={open}
      onToggle={onToggle}
      title={enrollment.course.courseTitle ?? "Untitled course"}
      meta={`Parent ${parent} · Teacher ${teacher} · Child ${child}`}
      keyLabel="Total paid"
      keyValue={paid}
      tags={
        <>
          {waitingTag}
          <span className={adminTag("amber")}>Enrollment pending</span>
        </>
      }
      footer={
        <>
          <AdminField
            id={`reject-${enrollment.id}`}
            label="Reason for rejecting"
            optional
            className="max-w-[360px] flex-[1_1_220px]"
          >
            <input
              id={`reject-${enrollment.id}`}
              type="text"
              value={reason}
              maxLength={500}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
              className={ADMIN_CONTROL}
            />
          </AdminField>

          <AdminDecisionBar>
            {enrollment.chatRoom && (
              <Link href={`/admin/chat/${enrollment.chatRoom.id}`} className={adminBtn("out")}>
                <MessageCircle size={16} aria-hidden="true" />
                View conversation
              </Link>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(enrollment.id, reason.trim() || undefined)}
              className={adminBtn("dtx")}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprove(enrollment.id)}
              className={adminBtn("pri")}
            >
              {busy ? "Saving…" : "Approve"}
            </button>
          </AdminDecisionBar>
        </>
      }
    >
      <AdminTwoCols>
        <AdminGroup title="People">
          <AdminProps
            items={[
              { label: "Parent", value: parent },
              { label: "Teacher", value: teacher },
              { label: "Child", value: child },
            ]}
          />
        </AdminGroup>
        <AdminGroup title="Plan">
          <AdminProps
            items={[
              { label: "Sessions a month", value: enrollment.sessionsPerMonth },
              { label: "Months", value: enrollment.noOfMonths },
              { label: "Start", value: start },
              { label: "Total paid", value: paid, highlight: true },
            ]}
          />
        </AdminGroup>
      </AdminTwoCols>

      {enrollment.revisedByTeacher && (
        <AdminGoldNote title="Revised by the teacher">
          Teacher revised this enrollment before forwarding it. The parent has confirmed.
          {enrollment.revisionNote && (
            <>
              {" "}
              <b>Note:</b> {enrollment.revisionNote}
            </>
          )}
        </AdminGoldNote>
      )}

      {enrollment.pricingChangedAfterPayment && (
        <div
          role="alert"
          className="rounded-xl border border-[#efcdca] bg-pd-red-bg px-3.5 py-3 text-[14px] text-pd-red"
        >
          <b>Amounts do not match.</b> The revised total ({formatRupees(enrollment.totalAmount)})
          differs from what was charged ({paid}). No automatic charge or refund was made. Reconcile
          manually before approving.
        </div>
      )}
    </AdminReviewCard>
  );
}
