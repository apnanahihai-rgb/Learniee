import type { CSSProperties } from "react";

import type { Course } from "@/features/courses/hooks/useTeacherCourses";

import { subjectStyle } from "@/features/teacher/components/home/teacherHomeLogic";

import { groupLabel, isGroupType } from "@/features/courses/utils/groupClass";

import { formatCreated, formatPrice, gradeLabel } from "./courseDisplay";

const COVER_TAG =
  "relative inline-flex items-center whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-(--sc)";

/** One course on the Teacher Courses page: coloured cover, title, facts, price, active students. */
export default function TeacherCourseCard({ course }: { course: Course }) {
  const { color } = subjectStyle(course.subject);
  const approved = course.status === "APPROVED";
  const price = formatPrice(course.price);
  const group = isGroupType(course.type);
  const facts = [
    gradeLabel(course.grade),
    course.board,
    group ? groupLabel(course.groupMaxStudents) : course.type,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      style={{ "--sc": color } as CSSProperties}
      className="flex flex-col overflow-hidden rounded-xl border border-pd-line bg-white transition-colors hover:border-pd-line2"
    >
      <div className="relative flex h-[88px] items-start justify-between bg-(--sc) p-3.5">
        <span
          aria-hidden="true"
          className="absolute -bottom-[26px] right-3.5 text-[92px] font-bold leading-none text-white/20"
        >
          {(course.subject?.[0] ?? "?").toUpperCase()}
        </span>
        <span className={COVER_TAG}>
          {course.subject || "Course"}
          {group && " · Group"}
        </span>
        <span className={COVER_TAG}>{approved ? "Approved" : "Under review"}</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <h3 className="font-heading text-[15px] font-semibold leading-[1.4] text-pd-ink [text-wrap:balance]">
          {course.courseTitle || "Untitled course"}
        </h3>

        <div className="flex flex-col gap-0.5 text-[13px] text-pd-ink3">
          {facts && <span>{facts}</span>}
          <span>Created {formatCreated(course.createdAt)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-semibold text-pd-ink">
            {price ?? "—"}
            {price && <small className="text-xs font-bold text-pd-ink3">/session</small>}
          </span>
          <span className="text-[13px] text-pd-ink3">{course.activeStudents ?? 0} active</span>
        </div>
      </div>
    </article>
  );
}
