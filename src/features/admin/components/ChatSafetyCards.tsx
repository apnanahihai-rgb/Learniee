"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminProps,
  AdminQuote,
  AdminReviewCard,
} from "@/features/admin/components/ui/queue";
import type {
  AdminChatFlagRow,
  AdminChatReportRow,
  ChatRole,
} from "@/features/admin/hooks/useChatReports";
import {
  CHAT_SCREEN_REASON_LABELS,
  type ChatScreenReason,
} from "@/features/chat/utils/chatScreening";

const ROLE: Record<ChatRole, string> = { PARENT: "Parent", TEACHER: "Teacher" };

export function formatChatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function reasonLabel(code: string) {
  return CHAT_SCREEN_REASON_LABELS[code as ChatScreenReason] ?? code;
}

/** Footer shared by both cards: open the chat, then mark reviewed (or show when it was). */
function CardFooter({
  chatRoomId,
  reviewedAt,
  busy,
  onReviewed,
}: {
  chatRoomId: string;
  reviewedAt: string | null;
  busy: boolean;
  onReviewed: () => void;
}) {
  return (
    <>
      <Link href={`/admin/chat/${chatRoomId}`} className={adminBtn("out")}>
        Open conversation
      </Link>
      {reviewedAt ? (
        <span className="ml-auto self-center text-[13px] text-pd-ink3">
          Reviewed {formatChatDateTime(reviewedAt)}
        </span>
      ) : (
        <AdminDecisionBar>
          <button type="button" disabled={busy} onClick={onReviewed} className={adminBtn("pri")}>
            {busy ? "Saving…" : "Mark reviewed"}
          </button>
        </AdminDecisionBar>
      )}
    </>
  );
}

interface CardProps {
  open: boolean;
  onToggle: () => void;
  waitingTag?: ReactNode;
  busy: boolean;
  onReviewed: () => void;
}

/** A message the system screened (blocked or suspicious), Admin design 12. */
export function ChatFlagCard({
  flag,
  ...card
}: CardProps & { flag: AdminChatFlagRow }) {
  const blocked = flag.level === "BLOCKED";

  return (
    <AdminReviewCard
      id={`chat-flag-${flag.id}`}
      open={card.open}
      onToggle={card.onToggle}
      title={`${flag.senderName} (${ROLE[flag.senderRole]})`}
      meta={formatChatDateTime(flag.createdAt)}
      tags={
        <>
          {card.waitingTag}
          <span className={adminTag(blocked ? "red" : "amber")}>
            {blocked ? "Blocked, not sent" : "Suspicious, was sent"}
          </span>
          {flag.courseTitle && <span className={adminTag("violet")}>{flag.courseTitle}</span>}
        </>
      }
      footer={
        <CardFooter
          chatRoomId={flag.chatRoomId}
          reviewedAt={flag.status === "REVIEWED" ? flag.reviewedAt : null}
          busy={card.busy}
          onReviewed={card.onReviewed}
        />
      }
    >
      <AdminQuote title="What they typed">{flag.text}</AdminQuote>
      <AdminProps
        items={[
          {
            label: "Why",
            value: (
              <>
                {flag.reasons.map(reasonLabel).join(", ")}
                {flag.detail && (
                  <small className="block text-xs font-normal text-pd-ink3">{flag.detail}</small>
                )}
              </>
            ),
            wide: true,
          },
        ]}
      />
    </AdminReviewCard>
  );
}

/** A message a parent or teacher reported, Admin design 12. */
export function ChatReportCard({
  report,
  ...card
}: CardProps & { report: AdminChatReportRow }) {
  const { message } = report;

  return (
    <AdminReviewCard
      id={`chat-report-${report.id}`}
      open={card.open}
      onToggle={card.onToggle}
      title={`${message.senderName} (${ROLE[message.senderRole]})`}
      meta={`Reported by ${report.reporterName} (${ROLE[report.reporterRole].toLowerCase()}) · ${formatChatDateTime(report.createdAt)}`}
      tags={
        <>
          {card.waitingTag}
          <span className={adminTag("amber")}>Reported</span>
          {report.courseTitle && <span className={adminTag("violet")}>{report.courseTitle}</span>}
        </>
      }
      footer={
        <CardFooter
          chatRoomId={report.chatRoomId}
          reviewedAt={report.status === "REVIEWED" ? report.reviewedAt : null}
          busy={card.busy}
          onReviewed={card.onReviewed}
        />
      }
    >
      <AdminQuote title={`Message sent ${formatChatDateTime(message.createdAt)}`}>
        {message.body}
      </AdminQuote>
      {message.originalBody && (
        <AdminGoldNote title="Original (phone number hidden from the other party)">
          {message.originalBody}
        </AdminGoldNote>
      )}
      {report.reason && <AdminProps items={[{ label: "Reason given", value: report.reason, wide: true }]} />}
    </AdminReviewCard>
  );
}
