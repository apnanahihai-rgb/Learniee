"use client";

import { useState } from "react";

import {
  useRatingBoard,
  type RatingBoardCourse,
  type RatingBoardTeacher,
} from "@/features/admin/hooks/useRatingBoard";
import RatedDeleteDialog from "@/features/admin/components/RatedDeleteDialog";
import RatingCell from "@/features/admin/components/RatingCell";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPill,
  AdminSearch,
  AdminStatCard,
  AdminTableCard,
  AdminTabs,
  adminButtonClass,
  adminRowClass,
  adminTableClass,
  adminTdClass,
  adminThClass,
} from "@/features/admin/components/ui/primitives";

type Tab = "courses" | "teachers";
type Target = { kind: "course"; row: RatingBoardCourse } | { kind: "teacher"; row: RatingBoardTeacher };

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

export default function AdminLowestRatedPage() {
  const { courses, teachers, bottomPercent, minReviews, loading, error, deleteCourse, deleteTeacher } =
    useRatingBoard();
  const [tab, setTab] = useState<Tab>("courses");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState("");

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

  const rows = tab === "courses" ? courseRows : teacherRows;

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Lowest rated"
        description={`The bottom ${bottomPercent}% of courses and teachers by parent review average (needs at least ${minReviews} reviews to be ranked). You can delete any course or teacher from the full list too.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard label="Courses flagged" value={flaggedCourses.length} />
        <AdminStatCard label="Teachers flagged" value={flaggedTeachers.length} />
        <AdminStatCard label="Courses total" value={courses.length} />
        <AdminStatCard label="Teachers total" value={teachers.length} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminTabs<Tab>
          label="Courses or teachers"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "courses", label: "Courses", count: courseRows.length },
            { value: "teachers", label: "Teachers", count: teacherRows.length },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearch value={query} onChange={setQuery} placeholder="Search name or email" />
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
            className={adminButtonClass("secondary")}
          >
            {showAll ? `Show bottom ${bottomPercent}% only` : "Show all"}
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl bg-admin-tint px-4 py-3 text-[15px] font-bold text-brand-dark">
          {notice}
        </p>
      )}
      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading ratings…" />
      ) : rows.length === 0 ? (
        <AdminEmpty
          message={
            showAll || q
              ? "Nothing matches."
              : "Nothing is in the bottom group yet. Use Show all to see every item."
          }
        />
      ) : (
        <AdminTableCard>
          <table className={`${adminTableClass} min-w-[820px]`}>
            <thead>
              <tr>
                <th className={adminThClass}>{tab === "courses" ? "Course" : "Teacher"}</th>
                <th className={adminThClass}>Rating</th>
                <th className={adminThClass}>In progress</th>
                <th className={`${adminThClass} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tab === "courses"
                ? courseRows.map((c) => (
                    <tr key={c.id} className={adminRowClass}>
                      <td className={adminTdClass}>
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold">{c.title}</span>
                          <span className="text-sm text-admin-muted">
                            {c.teacherName}
                            {c.subject ? ` · ${c.subject}` : ""} · {c.status.replace("_", " ").toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className={adminTdClass}>
                        <RatingCell {...c} />
                      </td>
                      <td className={adminTdClass}>
                        <AdminPill tone={c.liveEnrollments > 0 ? "warn" : "neutral"}>
                          {c.liveEnrollments} live enrollment{c.liveEnrollments === 1 ? "" : "s"}
                        </AdminPill>
                      </td>
                      <td className={`${adminTdClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => setTarget({ kind: "course", row: c })}
                          aria-label={`Delete course ${c.title}`}
                          className={adminButtonClass("danger")}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                : teacherRows.map((t) => (
                    <tr key={t.id} className={adminRowClass}>
                      <td className={adminTdClass}>
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold">{t.name}</span>
                          <span className="text-sm text-admin-muted">
                            {t.email} · {t.courseCount} course{t.courseCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </td>
                      <td className={adminTdClass}>
                        <RatingCell {...t} />
                      </td>
                      <td className={adminTdClass}>
                        <AdminPill tone={t.liveEnrollments > 0 ? "warn" : "neutral"}>
                          {t.liveEnrollments} live enrollment{t.liveEnrollments === 1 ? "" : "s"}
                        </AdminPill>
                      </td>
                      <td className={`${adminTdClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => setTarget({ kind: "teacher", row: t })}
                          aria-label={`Delete teacher ${t.name}`}
                          className={adminButtonClass("danger")}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </AdminTableCard>
      )}

      {target && (
        <RatedDeleteDialog
          kind={target.kind}
          name={target.kind === "course" ? target.row.title : `${target.row.name} (${target.row.email})`}
          blockedReason={blockedReason(target.row)}
          onCancel={() => setTarget(null)}
          onSubmit={async (reason) => {
            const result =
              target.kind === "course"
                ? await deleteCourse(target.row.id, reason)
                : await deleteTeacher(target.row.id, reason);

            if (!result.ok) return result.error ?? "Delete failed.";

            setNotice(
              target.kind === "teacher" && result.loginRemoved === false
                ? "Teacher deleted from the database, but the login could not be removed. Remove it in Cognito."
                : target.kind === "course"
                  ? "Course deleted."
                  : "Teacher account deleted.",
            );
            setTarget(null);

            return null;
          }}
        />
      )}
    </AdminPage>
  );
}
