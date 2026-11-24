"use client";

import type { ReactNode } from "react";

import { formatPlatformTime } from "@/lib/platformTime";
import { SESSION_STATUS_LABEL } from "@/features/shared/utils/sessionOutcome";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";
import { adminBtn, adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminGroup,
  AdminProps,
  AdminQuote,
  AdminReviewCard,
  AdminText,
  AdminTwoCols,
} from "@/features/admin/components/ui/queue";

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

/** Minutes both people were in the class, from the stored share of the class. */
export function minutesTogether(item: SessionReviewItem): number | null {
  if (item.overlapPercent === null || !item.startsAt || !item.endsAt) return null;

  const length = (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60_000;

  return Math.max(0, Math.round((length * item.overlapPercent) / 100));
}

/** When the item entered the queue — drives "Waiting N days". */
export function reviewWaitingSince(item: SessionReviewItem): string | null {
  return item.reportedAt ?? item.endsAt ?? item.startsAt;
}

const STATUS_COLOR: Partial<Record<SessionReviewItem["status"], AdminTagColor>> = {
  NEEDS_REVIEW: "red",
  COMPLETED: "green",
};

/** One class waiting for (or already given) an Admin decision, as a review card (Admin design 07). */
export default function SessionReviewCard({
  item,
  open,
  onToggle,
  waitingTag,
  onDecide,
}: {
  item: SessionReviewItem;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue. */
  waitingTag?: ReactNode;
  onDecide: () => void;
}) {
  const together = minutesTogether(item);
  const title = `${item.courseTitle ?? "Class"}${item.sessionNumber !== null ? ` · Class ${item.sessionNumber}` : ""}`;
  const isOverride = item.kind === "OVERRIDE";
  const cancelled = item.status === "CANCELLED" || item.status === "CANCELLED_LATE";

  return (
    <AdminReviewCard
      id={`review-${item.id}`}
      open={open}
      onToggle={onToggle}
      title={title}
      meta={`Teacher: ${item.teacherName} · Student: ${item.studentName} · ${at(item.startsAt)}`}
      keyLabel="Time together"
      keyValue={together !== null ? `${together} min` : "—"}
      tags={
        <>
          {waitingTag}
          {item.reason === "REPORTED" && <span className={adminTag("violet")}>Parent reported</span>}
          {item.reason === "DECIDED" && <span className={adminTag("green")}>Decided</span>}
          <span className={adminTag(STATUS_COLOR[item.status] ?? "gray")}>
            {SESSION_STATUS_LABEL[item.status]}
          </span>
        </>
      }
      footer={
        <AdminDecisionBar>
          <button
            type="button"
            onClick={onDecide}
            aria-label={`${isOverride ? "Override" : "Decide"} ${item.courseTitle ?? "class"} for ${item.studentName}`}
            className={adminBtn("pri")}
          >
            {isOverride ? "Override" : "Decide"}
          </button>
        </AdminDecisionBar>
      }
    >
      <AdminGroup title="Class timeline">
        <AdminProps
          items={[
            { label: "Teacher started", value: at(item.teacherStartedAt) },
            { label: "Student joined", value: at(item.studentJoinedAt) },
            { label: "Teacher ended", value: at(item.teacherEndedAt) },
            {
              label: "Time together",
              value: together !== null ? `${together} min` : "—",
              highlight: true,
            },
          ]}
        />
      </AdminGroup>

      {(item.reportNote || item.teacherSummary) && (
        <AdminTwoCols>
          {item.reportNote ? (
            <AdminQuote title={`Parent’s report · ${at(item.reportedAt)}`}>{item.reportNote}</AdminQuote>
          ) : (
            <span />
          )}
          {item.teacherSummary && (
            <AdminQuote title="Teacher’s summary">{item.teacherSummary}</AdminQuote>
          )}
        </AdminTwoCols>
      )}

      {cancelled && (
        <AdminText title="Cancellation">
          Cancelled by {item.cancelledByRole?.toLowerCase() ?? "unknown"}
          {item.cancelReason ? `: ${item.cancelReason}` : "."}
        </AdminText>
      )}

      {item.cycle?.status === "CLOSED" && (
        <AdminGoldNote title="Cycle already closed">
          Cycle {item.cycle.cycleNumber} has closed ({item.cycle.countedSessionCount ?? 0} counted,{" "}
          {item.cycle.forfeitedSessionCount ?? 0} forfeited
          {(item.cycle.excusedSessionCount ?? 0) > 0
            ? `, ${item.cycle.excusedSessionCount} excused with no make-up`
            : ""}
          ). A decision here re-counts it.
        </AdminGoldNote>
      )}

      {item.history.length > 0 && (
        <AdminGroup title="History">
          <ul className="flex flex-col gap-1">
            {item.history.map((h) => (
              <li key={h.id} className="text-[13px] text-pd-ink3">
                {at(h.createdAt)} · {h.kind === "OVERRIDE" ? "Override" : "Decision"}:{" "}
                {SESSION_STATUS_LABEL[h.fromStatus]} → {SESSION_STATUS_LABEL[h.toStatus]}
                {h.decidedByName ? ` · ${h.decidedByName}` : ""} — {h.reason}
              </li>
            ))}
          </ul>
        </AdminGroup>
      )}
    </AdminReviewCard>
  );
}
