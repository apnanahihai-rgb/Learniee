"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { PD_BTN_PRI, PD_BTN_PRI_SM, PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { CLASS_ROW_COLS } from "@/features/parent/components/my-classes/PdClassRow";
import { SubjectGlyph, subjectTheme } from "@/features/parent/components/my-classes/pdClassesUi";
import { whenLabel, dayDiff } from "@/features/parent/components/home/homeLogic";
import { useTeacherClasses } from "@/features/teacher/hooks/useMyClasses";
import type { TeacherClassSummary } from "@/features/teacher/types/myClasses";
import { TD_CARD } from "./TeacherUi";

function ClassRow({
  c,
  now,
  onManageGroup,
}: {
  c: TeacherClassSummary;
  now: Date;
  onManageGroup?: (courseId: string) => void;
}) {
  const color = subjectTheme(c.subject).color;
  const next = c.nextSessionAt ? new Date(c.nextSessionAt) : null;
  const today = next ? dayDiff(next, now) === 0 : false;
  const pct = c.averageProgressPercent;
  const titleClass =
    "text-left text-[15px] font-semibold leading-[1.3] text-pd-ink after:absolute after:inset-0 after:content-['']";
  // A group class is one shared class: its Start / Join page opens straight
  // from the row, no need to open a student first. The page itself enforces
  // the window (Start opens 10 minutes before).
  const groupStartHref = c.isGroup && c.nextSessionId ? `/teacher/classes/${c.nextSessionId}/start` : null;
  const live = c.liveNowCount > 0;

  return (
    <article
      style={{ "--sc": color } as CSSProperties}
      className={`${CLASS_ROW_COLS} relative border-t border-pd-line px-[18px] py-3.5 transition-colors first:border-t-0 hover:bg-[#faf9fe] max-[760px]:gap-y-3 max-[760px]:px-4`}
    >
      <SubjectGlyph
        subject={c.subject}
        className="absolute left-[18px] top-1/2 -translate-y-1/2 max-[760px]:left-4 max-[760px]:top-[26px] max-[760px]:translate-y-0"
      />

      <div className="flex min-w-0 flex-col gap-0.5 pl-[52px] max-[760px]:col-span-full max-[760px]:pr-[90px]">
        {onManageGroup && c.isGroup ? (
          <button type="button" onClick={() => onManageGroup(c.courseId)} className={titleClass}>
            {c.courseTitle ?? "Untitled course"}
          </button>
        ) : (
          <Link href={`/teacher/my-classes/${c.courseId}`} className={titleClass}>
            {c.courseTitle ?? "Untitled course"}
          </Link>
        )}
        <small className="text-[13px] text-pd-ink3">
          {c.isGroup && (
            <span className="mr-1.5 rounded-full bg-pd-bg px-2 py-0.5 text-[11px] font-semibold text-pd-brand">
              Group class
            </span>
          )}
          {c.isGroup && c.groupMaxStudents
            ? `${c.activeStudentCount} of ${c.groupMaxStudents} seats filled · ${c.studentCount} total`
            : `${c.activeStudentCount} active · ${c.studentCount} total`}
          {c.liveNowCount > 0 && (
            <span className="font-semibold text-pd-green">
              {c.isGroup ? " · Live now" : ` · ${c.liveNowCount} live now`}
            </span>
          )}
        </small>
      </div>

      <div className="flex min-w-0 flex-col gap-[3px] max-[760px]:col-start-1">
        <small className="text-xs text-pd-ink3">Next class</small>
        <b className={`text-sm font-semibold ${today ? "text-pd-brand" : ""}`}>{next ? whenLabel(next, now) : "—"}</b>
        {groupStartHref && (
          <Link
            href={groupStartHref}
            className={`${live ? PD_BTN_PRI_SM : PD_BTN_SEC_SM} relative z-[2] mt-1 w-fit`}
          >
            {live ? "Start / Join class" : "Open class"}
          </Link>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-[3px] max-[760px]:col-start-2">
        <small className="text-xs text-pd-ink3">Average cycle progress</small>
        <div className="h-[5px] overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, #fff)` }}>
          <i className="block h-full rounded-[inherit]" style={{ width: `${pct}%`, background: color }} />
        </div>
        <small className="text-xs text-pd-ink3">{pct}%</small>
      </div>

      <div className="relative z-[2] flex min-w-0 flex-wrap items-center justify-end gap-2 max-[760px]:absolute max-[760px]:right-2.5 max-[760px]:top-2.5">
        {onManageGroup && c.isGroup && (
          <button type="button" className={PD_BTN_SEC_SM} onClick={() => onManageGroup(c.courseId)}>
            Homework &amp; announcements
          </button>
        )}
        <Link href={`/teacher/my-classes?tab=students&course=${c.courseId}`} className={PD_BTN_SEC_SM}>
          Students
        </Link>
      </div>
    </article>
  );
}

/**
 * My classes > Classes / Group classes: one row per course with next class
 * and average progress. Group courses are listed apart from individual ones.
 */
export default function ClassesTab({
  groupOnly = false,
  onManageGroup,
}: {
  groupOnly?: boolean;
  onManageGroup?: (courseId: string) => void;
}) {
  const { classes: allClasses, loading, error } = useTeacherClasses();
  const classes = allClasses.filter((c) => c.isGroup === groupOnly);
  const now = new Date();

  return (
    <div className="mt-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div aria-busy="true" aria-label="Loading" className="h-[220px] animate-pulse rounded-2xl bg-[#eeeaf7]" />
      ) : classes.length === 0 ? (
        <div className={TD_CARD}>
          <PdEmpty
            icon={BookOpen}
            title={groupOnly ? "No group classes yet" : "No classes yet"}
            text={
              groupOnly
                ? "Group courses with enrolled students appear here."
                : "Courses with enrolled students appear here."
            }
            action={
              groupOnly ? (
                <Link href="/teacher/course-management/new?type=group" className={PD_BTN_PRI}>
                  Create group class
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={TD_CARD}>
          <div
            className={`${CLASS_ROW_COLS} border-b border-pd-line bg-pd-bg px-[18px] py-2.5 text-xs font-semibold text-pd-ink3 max-[760px]:hidden`}
          >
            <span>Course</span>
            <span>Next class</span>
            <span>Progress</span>
            <span />
          </div>
          {classes.map((c) => (
            <ClassRow key={c.courseId} c={c} now={now} onManageGroup={onManageGroup} />
          ))}
        </div>
      )}
    </div>
  );
}
