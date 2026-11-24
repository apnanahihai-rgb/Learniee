"use client";

import { useState, type ReactNode } from "react";

import { ADMIN_CONTROL, adminBtn, adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import { AdminField, AdminGroup } from "@/features/admin/components/ui/design";
import {
  AdminDecisionBar,
  AdminProps,
  AdminReviewCard,
  AdminText,
} from "@/features/admin/components/ui/queue";
import type { AdminClassRequest } from "@/features/class-requests/hooks/useClassRequests";
import { formatClassRequestDate } from "@/features/shared/utils/classRequestStatus";
import { displayName } from "@/features/shared/utils/displayName";
import { formatSchedule } from "@/features/shared/utils/weekdays";

interface Props {
  request: AdminClassRequest;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue (to-review list only). */
  waitingTag?: ReactNode;
  /** True while this request's decision is being saved. */
  busy: boolean;
  onApprove: (id: string) => void;
  /** Opens the required-reason dialog (the parent sees the reason). */
  onReject: (request: AdminClassRequest) => void;
  /** Optional note for the parent. */
  onClose: (id: string, note?: string) => void;
}

const STATUS: Record<string, { label: string; color: AdminTagColor }> = {
  PENDING_REVIEW: { label: "To review", color: "amber" },
  OPEN: { label: "Open vacancy", color: "violet" },
  REJECTED: { label: "Rejected", color: "red" },
  CLOSED: { label: "Closed", color: "gray" },
};

function courseState(status: string) {
  return status === "APPROVED" ? "live" : status.toLowerCase().replace(/_/g, " ");
}

/** One parent class request as a review card (Admin design 10). */
export default function ClassRequestCard({
  request,
  open,
  onToggle,
  waitingTag,
  busy,
  onApprove,
  onReject,
  onClose,
}: Props) {
  const [note, setNote] = useState("");

  const status = STATUS[request.status] ?? STATUS.CLOSED;
  const price = request.pricePerSession ? `₹${request.pricePerSession}/hour` : null;
  const tags = [request.subject, request.grade, request.board, request.language].filter(
    Boolean,
  ) as string[];

  const schedule =
    request.preferredDays.length > 0
      ? `${formatSchedule(request.preferredDays, request.preferredTime)} (IST)`
      : request.preferredSchedule;

  const accepted = request.responses.filter((r) => r.status === "ACCEPTED");
  const declined = request.responses.length - accepted.length;

  const details = [
    ...(request.sessionsPerWeek
      ? [{ label: "Classes a week", value: String(request.sessionsPerWeek) }]
      : []),
    ...(schedule ? [{ label: "Schedule", value: schedule, wide: true }] : []),
    ...(price ? [{ label: "Fixed price", value: price, highlight: true }] : []),
    ...(request.adminNote ? [{ label: "Your note", value: request.adminNote, wide: true }] : []),
  ];

  let footer: ReactNode;

  if (request.status === "PENDING_REVIEW") {
    footer = (
      <AdminDecisionBar>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReject(request)}
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
          {busy ? "Saving…" : "Approve and share"}
        </button>
      </AdminDecisionBar>
    );
  } else if (request.status === "OPEN") {
    footer = (
      <>
        <AdminField
          id={`creq-note-${request.id}`}
          label="Note for the parent"
          optional
          className="max-w-[360px] flex-[1_1_220px]"
        >
          <input
            id={`creq-note-${request.id}`}
            type="text"
            value={note}
            maxLength={500}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
            className={ADMIN_CONTROL}
          />
        </AdminField>

        <AdminDecisionBar>
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose(request.id, note.trim() || undefined)}
            className={adminBtn("out")}
          >
            {busy ? "Saving…" : "Close vacancy"}
          </button>
        </AdminDecisionBar>
      </>
    );
  }

  return (
    <AdminReviewCard
      id={`creq-${request.id}`}
      open={open}
      onToggle={onToggle}
      title={request.title}
      meta={`By ${request.parentName} (${request.parentEmail})${
        request.studentName ? ` for ${request.studentName}` : ""
      }, ${formatClassRequestDate(request.createdAt)}`}
      keyLabel="Price"
      keyValue={price}
      tags={
        <>
          {waitingTag}
          <span className={adminTag(status.color)}>{status.label}</span>
        </>
      }
      footer={footer}
    >
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className={adminTag("violet")}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <AdminText title="Description">
        <span className="whitespace-pre-line">{request.description}</span>
      </AdminText>

      {details.length > 0 && <AdminProps items={details} />}

      {request.status !== "PENDING_REVIEW" && request.responses.length > 0 && (
        <AdminGroup title={`Teacher responses: ${accepted.length} accepted, ${declined} declined`}>
          <ul className="flex flex-col gap-1 text-[14px] text-pd-ink2">
            {accepted.map((response) => (
              <li key={response.id}>
                {displayName(response.teacher)} accepted,{" "}
                {response.course
                  ? `listing “${response.course.courseTitle ?? "Untitled"}” (${courseState(response.course.status)})`
                  : "listing not created yet"}
              </li>
            ))}
          </ul>
        </AdminGroup>
      )}
    </AdminReviewCard>
  );
}
