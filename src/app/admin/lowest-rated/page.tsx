"use client";

import { useState } from "react";

import RatingCell from "@/features/admin/components/RatingCell";
import AdminReasonDialog from "@/features/admin/components/ui/AdminReasonDialog";
import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminSearchBox,
  AdminStack,
  AdminStats,
} from "@/features/admin/components/ui/design";
import {
  useRatingBoard,
  type RatingBoardCourse,
  type RatingBoardTeacher,
} from "@/features/admin/hooks/useRatingBoard";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

/**
 * Admin "Lowest rated" (design 17). The bottom 2% of courses and teachers by
 * parent review average (needs at least 3 reviews to be ranked); Admin can
 * delete any item with a reason.
 * Data: GET /api/admin/rating-board, delete: DELETE
 * /api/admin/rating-board/{courses|teachers}/[id] (verified Admin auth, reason
 * 5 to 500 characters, Activity Log, refused with live enrollments or open
 * payouts). See `ratingBoard.service.ts` and `ratingRemoval.service.ts`.
 */

type Tab = "courses" | "teachers";
type Target =
  | { kind: "course"; row: RatingBoardCourse }
  | { kind: "teacher"; row: RatingBoardTeacher };

/** Why the server will refuse a delete, shown before the Admin types a reason. */
function blockedReason(row: { liveEnrollments: number; openPayouts: number }): string | null {
  if (row.liveEnrollments > 0) {
    return `${row.liveEnrollments} live enrollment${row.liveEnrollments === 1 ? "" : "s"} must be cancelled or finished first.`;
  }

  if (row.openPayouts > 0) {
    return `${row.openPayouts} unfinished payout${row.openPayouts === 1 ? "" : "s"} must be settled first.`;
  }

  return null;
}

function InProgress({ live }: { live: number }) {
  return <span className={adminTag(live > 0 ? "amber" : "gray")}>{live > 0 ? `${live} live` : "None"}</span>;
}

export default function AdminLowestRatedPage() {
  const { courses, teachers, bottomPercent, minReviews, loading, error, deleteCourse, deleteTeacher } =
    useRatingBoard();
  const [tab, setTab] = useState<Tab>("courses");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [warning, setWarning] = useState("");
  const { toast, toastNode } = usePdToast();

  const q = query.trim().toLowerCase();
  const flaggedCourses = courses.filter((c) => c.flagged);
  const flaggedTeachers = teachers.filter((t) => t.flagged);

  const courseRows = courses.filter(
    (c) =>
      (showAll || c.flagged) &&
      (!q || `${c.title} ${c.teacherName} ${c.subject ?? ""}`.toLowerCase().includes(q)),
  );
  const teacherRows = teachers.filter(
    (t) => (showAll || t.flagged) && (!q || `${t.name} ${t.email}`.toLowerCase().includes(q)),
  );

  const rowCount = tab === "courses" ? courseRows.length : teacherRows.length;

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Lowest rated"
        description={`The bottom ${bottomPercent}% of courses and teachers by parent review average (needs at least ${minReviews} reviews to be ranked). You can delete one with a reason.`}
      />

      <AdminStats
        items={[
          { label: "Courses flagged", value: flaggedCourses.length },
          { label: "Teachers flagged", value: flaggedTeachers.length },
          { label: "Courses total", value: courses.length },
          { label: "Teachers total", value: teachers.length },
        ]}
      />

      <AdminPillTabs<Tab>
        label="Rated by"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "courses", label: "Courses", count: courseRows.length },
          { value: "teachers", label: "Teachers", count: teacherRows.length },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchBox value={query} onChange={setQuery} placeholder="Search name or email" />
        <button
          type="button"
          aria-pressed={showAll}
          onClick={() => setShowAll((value) => !value)}
          className={adminBtn("out")}
        >
          {showAll ? `Show bottom ${bottomPercent}% only` : "Show all"}
        </button>
      </div>

      {warning && (
        <p
          role="status"
          className="rounded-xl border border-[#efd694] bg-pd-amber-bg px-4 py-3 text-[14px] text-pd-amber"
        >
          {warning}
        </p>
      )}
      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading ratings…" />
      ) : rowCount === 0 ? (
        <AdminEmptyState
          message={
            showAll || q
              ? "Nothing matches."
              : "Nothing is in the bottom group yet. Use Show all to see every item."
          }
        />
      ) : tab === "courses" ? (
        <AdminDataTable
          rows={courseRows}
          rowKey={(c) => c.id}
          columns={[
            {
              label: "Course",
              block: true,
              render: (c) => (
                <div className="text-left">
                  <b className="block font-semibold">{c.title}</b>
                  <small className="block text-xs text-pd-ink3">
                    {c.teacherName}
                    {c.subject ? ` · ${c.subject}` : ""}
                  </small>
                </div>
              ),
            },
            { label: "Rating", render: (c) => <RatingCell {...c} showStatus={showAll} /> },
            { label: "In progress", render: (c) => <InProgress live={c.liveEnrollments} /> },
            {
              label: "Action",
              right: true,
              block: true,
              render: (c) => (
                <button
                  type="button"
                  onClick={() => setTarget({ kind: "course", row: c })}
                  aria-label={`Delete course ${c.title}`}
                  className={adminBtn("dtx", "sm")}
                >
                  Delete
                </button>
              ),
            },
          ]}
        />
      ) : (
        <AdminDataTable
          rows={teacherRows}
          rowKey={(t) => t.id}
          columns={[
            {
              label: "Teacher",
              block: true,
              render: (t) => (
                <div className="text-left">
                  <b className="block font-semibold">{t.name}</b>
                  <small className="block text-xs text-pd-ink3">
                    {t.email} · {t.courseCount} course{t.courseCount === 1 ? "" : "s"}
                  </small>
                </div>
              ),
            },
            { label: "Rating", render: (t) => <RatingCell {...t} showStatus={showAll} /> },
            { label: "In progress", render: (t) => <InProgress live={t.liveEnrollments} /> },
            {
              label: "Action",
              right: true,
              block: true,
              render: (t) => (
                <button
                  type="button"
                  onClick={() => setTarget({ kind: "teacher", row: t })}
                  aria-label={`Delete teacher ${t.name}`}
                  className={adminBtn("dtx", "sm")}
                >
                  Delete
                </button>
              ),
            },
          ]}
        />
      )}

      {target && (
        <AdminReasonDialog
          danger
          title={`Delete “${target.kind === "course" ? target.row.title : target.row.name}”`}
          description={
            target.kind === "course"
              ? "This is permanent. It removes the course with its past enrollments, classes, reviews and certificates. It is refused while there are live enrollments or unfinished payouts."
              : "This is permanent. It removes the teacher's login and everything linked to it: courses, reviews, past classes, files and certificates. It is refused while there are live enrollments or unfinished payouts."
          }
          confirmLabel="Delete"
          hint="Required, 5 to 500 characters. Saved in the Activity Log."
          blockedReason={blockedReason(target.row)}
          onCancel={() => setTarget(null)}
          onSubmit={async (reason) => {
            const result =
              target.kind === "course"
                ? await deleteCourse(target.row.id, reason)
                : await deleteTeacher(target.row.id, reason);

            if (!result.ok) return result.error ?? "Delete failed.";

            if (target.kind === "teacher" && result.loginRemoved === false) {
              setWarning(
                "Teacher deleted from the database, but the login could not be removed. Remove it in Cognito.",
              );
            } else {
              setWarning("");
            }

            toast(target.kind === "course" ? "Course deleted" : "Teacher account deleted");
            setTarget(null);

            return null;
          }}
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
