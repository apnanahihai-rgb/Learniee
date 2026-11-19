"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { KidAvatar, Tag } from "@/features/parent/components/home/HomeBits";
import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import { displayName } from "@/features/shared/utils/displayName";
import { useTeacherEnrollments, type TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { CoursePills, TD_CARD, TD_ROW, avatarColor } from "./TeacherUi";

type Tone = "amber" | "green" | "violet" | "red" | "gray";

/** Statuses shown in the roster, with the design's wording. Rejected/cancelled never appear. */
const STATUS_TAG: Record<string, [string, Tone]> = {
  ACTIVE: ["Active", "green"],
  LAPSED: ["Active", "green"],
  APPROVED: ["Approved", "green"],
  PENDING_APPROVAL: ["Awaiting your review", "amber"],
  PENDING_TEACHER_APPROVAL: ["Awaiting your review", "amber"],
  PENDING_PARENT_RECONFIRMATION: ["Awaiting parent", "violet"],
  PENDING_ADMIN_APPROVAL: ["Sent to admin", "violet"],
  COMPLETED: ["Completed", "gray"],
};

function StudentRow({ e }: { e: TeacherEnrollment }) {
  const name = displayName(e.student);
  const parent = displayName(e.parent);
  const [label, tone] = STATUS_TAG[e.status] ?? [e.status, "gray" as Tone];
  const isLive = e.status === "ACTIVE" || e.status === "LAPSED" || e.status === "COMPLETED";
  const href = isLive
    ? `/teacher/my-classes/${e.course.id}/${e.id}`
    : `/teacher/enrollments/${e.id}`;
  const showCount = e.status === "ACTIVE" && !e.isLegacy && e.sessionsPerMonth > 0;

  return (
    <Link href={href} className={`${TD_ROW} transition-colors hover:bg-[#faf9fe]`}>
      <KidAvatar name={name} color={avatarColor(name)} />
      <div className="min-w-0 flex-1 basis-[200px]">
        <b className="block truncate text-sm font-semibold text-pd-ink">{name}</b>
        <small className="block truncate text-xs text-pd-ink3">
          Parent: {parent} · {e.course.courseTitle ?? "Course"}
        </small>
      </div>
      {showCount && (
        <small className="text-xs text-pd-ink3">
          {e.sessionsCompletedInCycle}/{e.sessionsPerMonth}
        </small>
      )}
      <Tag tone={tone}>{label}</Tag>
    </Link>
  );
}

/** My classes > Students: every student with a course filter and the header search (?q=). */
export default function StudentsTab() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const { enrollments, loading, error } = useTeacherEnrollments();
  const [picked, setPicked] = useState<string | null>(null);
  const filter = picked ?? params.get("course") ?? "all";

  const roster = useMemo(() => enrollments.filter((e) => e.status in STATUS_TAG), [enrollments]);

  const courses = useMemo(() => {
    const seen = new Map<string, string>();

    for (const e of roster) {
      if (!seen.has(e.course.id)) {
        seen.set(e.course.id, [e.course.subject, e.course.courseTitle].filter(Boolean).join(" · ") || "Course");
      }
    }

    return [...seen].map(([id, label]) => ({ id, label }));
  }, [roster]);

  const rows = roster.filter((e) => {
    if (filter !== "all" && e.course.id !== filter) return false;
    if (!q) return true;

    return `${displayName(e.student)} ${displayName(e.parent)}`.toLowerCase().includes(q);
  });

  return (
    <div>
      {error && <div className="mt-5"><ErrorBanner>{error}</ErrorBanner></div>}

      {courses.length > 1 && <CoursePills courses={courses} value={filter} onChange={setPicked} />}
      {courses.length <= 1 && <div className="h-5" />}

      {loading ? (
        <div aria-busy="true" aria-label="Loading" className="h-[220px] animate-pulse rounded-2xl bg-[#eeeaf7]" />
      ) : (
        <div className={TD_CARD}>
          {rows.length === 0 ? (
            <PdEmpty
              icon={Users}
              title="No students"
              text={q ? `Nobody matches “${params.get("q")}”.` : "Nothing here yet."}
            />
          ) : (
            rows.map((e) => <StudentRow key={e.id} e={e} />)
          )}
        </div>
      )}
    </div>
  );
}
