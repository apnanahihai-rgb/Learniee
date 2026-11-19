import Link from "next/link";
import { Plus } from "lucide-react";

import { BTN_PRI, BTN_TXT, Section } from "@/features/parent/components/home/HomeBits";
import { dayDiff, dayLabel, fmtTime, inr } from "@/features/parent/components/home/homeLogic";

import { isSessionUpcoming, subjectStyle } from "./teacherHomeLogic";
import type { TeacherHomeCourse, TeacherHomeSession } from "@/features/teacher/types/home";

/** Round "active students" ring on a course banner. */
function MiniRing({ percent, color, label }: { percent: number; color: string; label: string }) {
  const size = 48;
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const h = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0 rounded-full bg-white shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--sc)_40%,transparent)]"
    >
      <circle cx={h} cy={h} r={r} fill="none" stroke={`color-mix(in srgb, ${color} 18%, #fff)`} strokeWidth={5} />
      <circle
        cx={h}
        cy={h}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${(c * percent) / 100} ${c}`}
        transform={`rotate(-90 ${h} ${h})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill={color}>
        {label}
      </text>
    </svg>
  );
}

function CourseTile({
  course,
  sessions,
  now,
}: {
  course: TeacherHomeCourse;
  sessions: TeacherHomeSession[];
  now: Date;
}) {
  const { color, glyph } = subjectStyle(course.subject);
  const pend = !course.approved;

  const next = sessions
    .filter((s) => s.kind === "class" && s.courseId === course.id && isSessionUpcoming(s, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const today = !!next && dayDiff(next.start, now) === 0;

  const pill = pend ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-pd-bg px-[11px] py-[5px] text-[12.5px] font-semibold text-pd-ink3">
      Awaiting admin
    </span>
  ) : next ? (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold ${
        today
          ? "bg-(--sc) text-white"
          : "bg-[color-mix(in_srgb,var(--sc)_10%,#fff)] text-[color-mix(in_srgb,var(--sc)_80%,#000)]"
      }`}
    >
      <i className={`size-[7px] rounded-full ${today ? "bg-white" : "bg-(--sc)"}`} />
      {today ? "Today" : dayLabel(next.start, now)} · {fmtTime(next.start)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-pd-bg px-[11px] py-[5px] text-[12.5px] font-semibold text-pd-ink3">
      Nothing scheduled
    </span>
  );

  return (
    <Link
      href="/teacher/my-classes"
      style={{ "--sc": pend ? "#a7a2bd" : color } as React.CSSProperties}
      className={`flex flex-col items-stretch overflow-hidden rounded-[20px] border text-left transition-colors duration-150 hover:border-pd-line2 ${
        pend ? "border-dashed border-pd-line bg-pd-bg" : "border-pd-line bg-white"
      }`}
    >
      <span
        className={`flex items-center justify-between px-4 pb-3.5 pt-4 ${
          pend ? "bg-[#eceaf3]" : "bg-[color-mix(in_srgb,var(--sc)_14%,#fff)]"
        }`}
      >
        <span
          className={`grid size-[46px] shrink-0 place-items-center rounded-[14px] bg-(--sc) text-[17px] font-bold tracking-[-0.02em] text-white ${
            pend ? "" : "shadow-[0_6px_14px_-6px_var(--sc)]"
          }`}
        >
          {glyph}
        </span>
        {pend ? (
          <span className="text-right text-xs font-semibold leading-tight text-pd-ink2">
            Under
            <br />
            review
          </span>
        ) : (
          <MiniRing percent={course.progress} color={color} label={String(course.activeStudents)} />
        )}
      </span>

      <span className="flex flex-col gap-0.5 px-4 pb-1 pt-3.5">
        <b className="text-pretty text-base font-semibold leading-[1.3] text-pd-ink">{course.title}</b>
        <small className="text-[13px] text-pd-ink3">
          {[
            course.subject,
            course.grade ? `Grade ${course.grade}` : null,
            course.price != null ? `${inr(course.price)}/session` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>

      <span className="mt-auto flex items-center justify-between gap-2 px-4 pb-4 pt-2.5">
        <span className="inline-flex items-center gap-[7px] text-[13px] font-semibold text-pd-ink2">
          {course.activeStudents} active student{course.activeStudents === 1 ? "" : "s"}
        </span>
        {pill}
      </span>
    </Link>
  );
}

export default function TeacherCourseTiles({
  courses,
  sessions,
  now,
}: {
  courses: TeacherHomeCourse[];
  sessions: TeacherHomeSession[];
  now: Date;
}) {
  return (
    <Section
      id="home-courses"
      title="Your courses"
      action={
        <Link href="/teacher/courses" className={BTN_TXT}>
          Manage
        </Link>
      }
    >
      {courses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-pd-line2 bg-white px-4 py-8 text-center">
          <p className="text-sm text-pd-ink3">You haven&apos;t created any courses yet.</p>
          <Link href="/teacher/course-management/new" className={`${BTN_PRI} !h-[42px] !px-4 !text-sm`}>
            <Plus size={16} />
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 min-[561px]:grid-cols-2">
          {courses.slice(0, 4).map((c) => (
            <CourseTile key={c.id} course={c} sessions={sessions} now={now} />
          ))}
        </div>
      )}
    </Section>
  );
}
