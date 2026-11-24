"use client";

import { useState } from "react";

import SessionDecisionDialog from "@/features/admin/components/SessionDecisionDialog";
import SessionReviewCard, { reviewWaitingSince } from "@/features/admin/components/SessionReviewCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminGoldNote, AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { adminBtn } from "@/features/admin/components/ui/adminStyles";
import { useSessionReviews } from "@/features/admin/hooks/useSessionReviews";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";

type Tab = "open" | "decided";

const REASON_CHIP = {
  NEEDS_REVIEW: "Needs review",
  REPORTED: "Parent reported",
  DECIDED: "Decided",
} as const;

export default function AdminSessionReviewsPage() {
  // Data: GET /api/admin/session-reviews, decisions: POST
  // /api/admin/session-reviews/[sessionId] (verified Admin auth, live
  // refresh, Activity Log entry, ledger reconcile on every decision).
  const { open, decided, loading, error, decide } = useSessionReviews();
  const [tab, setTab] = useState<Tab>("open");
  const [active, setActive] = useState<SessionReviewItem | null>(null);
  const [notice, setNotice] = useState<string[]>([]);

  async function handleSubmit(status: string, reason: string) {
    if (!active) return null;

    const result = await decide({
      sessionId: active.id,
      status,
      expectedStatus: active.status,
      reason,
    });

    if (!result.ok) return result.error ?? "Failed to save this decision.";

    setNotice(result.warnings);
    setActive(null);

    return null;
  }

  function toItem(item: SessionReviewItem, waiting: boolean): AdminQueueItem {
    return {
      id: item.id,
      group: REASON_CHIP[item.reason],
      date: waiting ? reviewWaitingSince(item) : (item.history[0]?.createdAt ?? reviewWaitingSince(item)),
      searchText: [
        item.courseTitle,
        item.teacherName,
        item.studentName,
        item.parentName,
        item.reportNote,
        item.teacherSummary,
      ]
        .filter(Boolean)
        .join(" "),
      render: ({ open: isOpen, onToggle, waitingTag }) => (
        <SessionReviewCard
          item={item}
          open={isOpen}
          onToggle={onToggle}
          waitingTag={waitingTag}
          onDecide={() => setActive(item)}
        />
      ),
    };
  }

  const items = (tab === "open" ? open : decided).map((item) => toItem(item, tab === "open"));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Class reviews"
        description="Classes a parent reported, or that need an outcome decided."
      />

      <div>
        <AdminPillTabs
          label="Review status"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "open", label: "Needs a decision", count: open.length },
            { value: "decided", label: "Decided" },
          ]}
        />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {notice.length > 0 && (
        <AdminGoldNote title="Decision saved. Please note:">
          <span className="flex flex-col gap-1">
            {notice.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
            <button
              type="button"
              onClick={() => setNotice([])}
              className={`${adminBtn("out", "sm")} mt-1 self-start`}
            >
              Dismiss
            </button>
          </span>
        </AdminGoldNote>
      )}

      {loading ? (
        <AdminLoadingState message="Loading class reviews…" />
      ) : items.length === 0 ? (
        <AdminEmptyState
          message={tab === "open" ? "Nothing is waiting on a decision." : "No decisions have been made yet."}
        />
      ) : (
        <AdminQueue
          key={tab}
          items={items}
          countLabel={tab === "open" ? "waiting" : "decided"}
          showWaiting={tab === "open"}
          searchPlaceholder="Filter by course, teacher, student or parent"
        />
      )}

      {active && (
        <SessionDecisionDialog
          item={active}
          onCancel={() => setActive(null)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminStack>
  );
}
