"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import {
  formatINR,
  initialOf,
  kidColor,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type { DashboardCourseRec, DashboardKid } from "@/features/parent/types/dashboard";

const SUBJECT_COLOR: Record<string, string> = {
  Mathematics: "#5931a2",
  English: "#be185d",
  Chemistry: "#0f766e",
  Physics: "#1d4ed8",
  Biology: "#4d7c0f",
  Hindi: "#b45309",
  "Computer Science": "#475569",
};

interface Props {
  kids: DashboardKid[];
  items: DashboardCourseRec[];
  /** Name shown in the heading ("Aarav", or "your children" for All). */
  heading: string;
  /** More than one learner in view: tag each card with who it is for. */
  showKid: boolean;
}

/** "Courses for Aarav": up to three picks, scored server-side. */
export default function RecommendedCourses({ kids, items, heading, showKid }: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="dash-recs">
      <h2 id="dash-recs" className="mb-3 flex items-center justify-between gap-3 font-heading text-lg font-semibold">
        Courses for {heading}
        <Link
          href="/parent/courses"
          className="rounded-lg px-2 py-1 font-sans text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
        >
          Browse all
        </Link>
      </h2>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => {
          const color = SUBJECT_COLOR[r.subject] ?? "#5931a2";

          return (
            <article
              key={`${r.courseId}-${r.studentId}`}
              className="flex flex-col overflow-hidden rounded-[14px] border border-[#ebe8f3] bg-white shadow-sm transition hover:border-[#ece1fe] hover:shadow-[0_8px_24px_-10px_rgba(23,23,43,.2)]"
            >
              <div
                className="relative flex h-[88px] items-start justify-between p-3.5"
                style={{
                  background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #fff))`,
                }}
              >
                <span className="pointer-events-none absolute -bottom-6 right-3.5 text-[92px] font-bold leading-none text-white/20">
                  {initialOf(r.subject)}
                </span>
                <span
                  className="relative rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color }}
                >
                  {r.subject || "Course"}
                </span>
                <span className="relative inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[#55516e]">
                  {r.rating !== null ? (
                    <>
                      <Star size={13} className="fill-[#f4c01e] text-[#f4c01e]" />
                      {r.rating}
                    </>
                  ) : (
                    <span className="text-[#15803d]">New</span>
                  )}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
                <h3 className="text-[15px] font-semibold leading-snug">{r.title}</h3>

                <div className="flex items-center gap-2 text-[13px] font-bold text-[#55516e]">
                  <span className="grid size-7 place-items-center rounded-full bg-[#ebe9f5] text-xs font-semibold text-[#4b4575]">
                    {initialOf(r.teacherName)}
                  </span>
                  <span className="truncate">{r.teacherName}</span>
                </div>

                {showKid && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#55516e]">
                    <i
                      className="size-2 rounded-full"
                      style={{ backgroundColor: kidColor(kids, r.studentId) }}
                    />
                    For {r.studentName}
                    {r.grade !== null ? ` · Grade ${r.grade}` : ""}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">
                    {formatINR(r.price)}
                    <small className="text-xs font-bold text-[#7d7998]">/session</small>
                  </span>
                  <Link
                    href={r.href}
                    className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-dark"
                  >
                    Enroll
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
