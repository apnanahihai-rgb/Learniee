"use client";

import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { PD_BTN_PRI_SM, PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import {
  useHomeworkOverview,
  type HomeworkOverviewItem,
} from "@/features/teacher/hooks/useHomeworkOverview";
import AssignHomeworkDialog from "./AssignHomeworkDialog";
import ReviewHomeworkDialog from "./ReviewHomeworkDialog";
import { ActionBar, TD_CARD, TD_ROW, dShort, useNotice } from "./TeacherUi";

function statusOf(h: HomeworkOverviewItem, now: number) {
  if (h.submission?.status === "SUBMITTED") return <Tag tone="amber">To review</Tag>;
  if (h.submission?.status === "REVIEWED") return <Tag tone="green">Reviewed</Tag>;
  if (h.dueDate && new Date(h.dueDate).getTime() < now) return <Tag tone="red">Overdue</Tag>;

  return <Tag tone="gray">Not submitted</Tag>;
}

/** My classes > Homework: assigned work, newest first, with a Review action once submitted. */
export default function HomeworkTab() {
  const { homeworks, loading, error, assign, review } = useHomeworkOverview();
  const { enrollments } = useTeacherEnrollments();
  const [assigning, setAssigning] = useState(false);
  const [reviewing, setReviewing] = useState<HomeworkOverviewItem | null>(null);
  const notice = useNotice();
  const now = Date.now();

  return (
    <div>
      <ActionBar
        text="Assign work, then review submissions. No numeric grade."
        action={
          <button type="button" className={PD_BTN_PRI_SM} onClick={() => setAssigning(true)}>
            <Plus size={14} />
            Assign homework
          </button>
        }
      />
      {notice.node}
      {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}

      <div className={`${TD_CARD} mt-3`}>
        {loading ? (
          <div aria-busy="true" aria-label="Loading" className="h-[160px] animate-pulse bg-[#eeeaf7]" />
        ) : homeworks.length === 0 ? (
          <PdEmpty icon={ClipboardList} title="No homework yet" text="Homework you assign appears here." />
        ) : (
          homeworks.map((h) => (
            <div key={h.id} className={TD_ROW}>
              <div className="min-w-0 flex-1 basis-[220px]">
                <b className="block truncate text-sm font-semibold text-pd-ink">{h.title}</b>
                <small className="block truncate text-xs text-pd-ink3">
                  {h.subject ?? h.courseTitle ?? "Course"} · {h.studentName}
                  {h.dueDate ? ` · Due ${dShort(h.dueDate)}` : ""}
                </small>
              </div>
              {statusOf(h, now)}
              {h.submission?.status === "SUBMITTED" && (
                <button type="button" className={PD_BTN_SEC_SM} onClick={() => setReviewing(h)}>
                  Review
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {assigning && (
        <AssignHomeworkDialog
          enrollments={enrollments}
          onClose={() => setAssigning(false)}
          onAssign={async (input) => {
            const result = await assign(input);
            if (result.ok) notice.show(result.message ?? "Homework assigned");
            return result;
          }}
        />
      )}

      {reviewing && (
        <ReviewHomeworkDialog
          homework={reviewing}
          onClose={() => setReviewing(null)}
          onReview={async (id, feedback) => {
            const result = await review(id, feedback);
            if (result.ok) notice.show("Marked as reviewed");
            return result;
          }}
        />
      )}
    </div>
  );
}
