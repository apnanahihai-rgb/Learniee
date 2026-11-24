"use client";

import type { ReactNode } from "react";

import { adminBtn, adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDecisionBar,
  AdminProps,
  AdminReviewCard,
  AdminText,
} from "@/features/admin/components/ui/queue";
import type { AdminComplaint } from "@/features/admin/hooks/useComplaints";
import {
  COMPLAINT_DEPARTMENT_LABELS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

type Status = AdminComplaint["status"];

const STATUS: Record<Status, { label: string; color: AdminTagColor }> = {
  OPEN: { label: "Open", color: "amber" },
  IN_PROGRESS: { label: "In progress", color: "violet" },
  RESOLVED: { label: "Resolved", color: "green" },
  CLOSED: { label: "Closed", color: "gray" },
};

/** Department name shown on the chip; old complaints have none. */
export function complaintDepartmentLabel(department: AdminComplaint["department"]) {
  return department ? COMPLAINT_DEPARTMENT_LABELS[department as ComplaintDepartmentValue] : "General";
}

export function formatComplaintDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  complaint: AdminComplaint;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue (open list only). */
  waitingTag?: ReactNode;
  /** True while this complaint's update is being saved. */
  busy: boolean;
  onInProgress: (id: string) => void;
  onResolve: (id: string) => void;
  onClose: (id: string) => void;
}

/** One complaint as a review card (Admin design 13). */
export default function ComplaintCard({
  complaint,
  open,
  onToggle,
  waitingTag,
  busy,
  onInProgress,
  onResolve,
  onClose,
}: Props) {
  const status = STATUS[complaint.status] ?? STATUS.CLOSED;
  const active = complaint.status === "OPEN" || complaint.status === "IN_PROGRESS";
  const raiser = complaint.raiserRole === "PARENT" ? "Parent" : "Teacher";
  const who = [`${raiser} · ${complaint.raiserName?.trim() || "Unknown"}`, complaint.raiserEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <AdminReviewCard
      id={`complaint-${complaint.id}`}
      open={open}
      onToggle={onToggle}
      title={complaint.subject}
      meta={`${who} · ${formatComplaintDate(complaint.createdAt)}`}
      tags={
        <>
          {waitingTag}
          <span className={adminTag("violet")}>{complaintDepartmentLabel(complaint.department)}</span>
          <span className={adminTag(status.color)}>{status.label}</span>
        </>
      }
      footer={
        active ? (
          <>
            <span className="flex-1" />
            <AdminDecisionBar>
              {complaint.status === "OPEN" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onInProgress(complaint.id)}
                  className={adminBtn("out")}
                >
                  Mark in progress
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onClose(complaint.id)}
                className={adminBtn("out")}
              >
                Close
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onResolve(complaint.id)}
                className={adminBtn("pri")}
              >
                {busy ? "Saving…" : "Resolve"}
              </button>
            </AdminDecisionBar>
          </>
        ) : undefined
      }
    >
      <AdminText title="Description">
        <span className="whitespace-pre-wrap">{complaint.description}</span>
      </AdminText>

      {!active && (complaint.adminNote || complaint.resolvedAt) && (
        <AdminProps
          items={[
            ...(complaint.resolvedAt
              ? [{ label: "Decided", value: formatComplaintDate(complaint.resolvedAt) }]
              : []),
            ...(complaint.adminNote
              ? [{ label: "Your note", value: complaint.adminNote, wide: true }]
              : []),
          ]}
        />
      )}
    </AdminReviewCard>
  );
}
