"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import type { ParentCourse } from "@/features/parent/types/course";
import { NeutralAvatar, RatingBadge, Tag } from "@/features/parent/components/home/HomeBits";
import { SUBJECT_COLOR } from "@/features/parent/components/home/homeLogic";
import { groupBookingFromCourse, groupLabel, groupRegistrationState, isGroupType } from "@/features/courses/utils/groupClass";
import CourseEnrollDialog from "@/features/parent/components/courses/CourseEnrollDialog";
import {
  GridSkeleton,
  PD_BTN_PRI_SM,
  PD_BTN_SEC,
  PD_SEARCH_INPUT,
  PdEmpty,
  coursePrice,
  pillFilter,
  rupees,
  teacherDisplayName,
} from "@/features/parent/components/courses/pdUi";

function CourseCard({ course, onEnroll }: { course: ParentCourse; onEnroll: () => void }) {
  const subject = course.subject ?? "Course";
  const name = teacherDisplayName(course.teacher);
  const price = coursePrice(course.price);
  const rating = course.teacher.averageRating;
  const group = isGroupType(course.type);
  const booking = group ? groupBookingFromCourse(course) : null;
  const full = !!booking && booking.maxStudents !== null && booking.seatsTaken >= booking.maxStudents;
  const registration = booking ? groupRegistrationState(booking.regStartDate, booking.lastRegistrationDate) : "OPEN";
  // A group can't be joined when it is full or outside its registration period.
  const unavailable = full || registration !== "OPEN";
  const unavailableLabel = full
    ? "Full"
    : registration === "NOT_OPEN"
      ? `Opens ${booking?.regStartDate ?? ""}`
      : "Registration closed";

  return (
    <article
      style={{ "--sc": SUBJECT_COLOR[subject] ?? "#5931a2" } as React.CSSProperties}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-pd-line bg-white transition-colors hover:border-pd-line2"
    >
      <div className="relative flex h-[88px] items-start justify-between overflow-hidden bg-(--sc) p-3.5">
        <span className="absolute -bottom-[26px] right-3.5 text-[92px] font-bold leading-none text-white/20">
          {subject[0]}
        </span>
        <Tag tone="violet" className="relative bg-white/90! text-(--sc)!">
          {subject}
        </Tag>
        <RatingBadge rating={rating != null ? Number(rating.toFixed(1)) : null} />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pb-[18px] pt-4">
        <h3 className="font-heading text-[15px] font-semibold leading-[1.4]">
          <Link href={`/parent/courses/${course.id}`} className="hover:text-pd-brand-d">
            {course.courseTitle || "Untitled course"}
          </Link>
        </h3>

        <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-pd-ink2">
          <NeutralAvatar name={name} small />
          <span className="truncate">{name}</span>
        </div>

        {group && (
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="amber">{groupLabel(course.groupMaxStudents)}</Tag>
            {booking?.ageMin != null && booking.ageMax != null && (
              <Tag tone="violet">{`Ages ${booking.ageMin}–${booking.ageMax}`}</Tag>
            )}
            {unavailable && <Tag tone="amber">{unavailableLabel}</Tag>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-semibold">
            {price ? rupees(price) : "—"}
            <small className="text-xs font-bold text-pd-ink3">/session</small>
          </span>
          <button
            type="button"
            onClick={onEnroll}
            disabled={unavailable}
            className={`${PD_BTN_PRI_SM} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {full ? "Full" : "Enroll"}
          </button>
        </div>
      </div>
    </article>
  );
}

type KindFilter = "all" | "single" | "group";

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All classes" },
  { key: "single", label: "One-on-one" },
  { key: "group", label: "Group classes" },
];

/**
 * "Courses" tab — approved courses (one-on-one and group together), searchable
 * (also by `?q=` from the top bar) and filterable by class type and subject.
 * `?type=group` opens with the group filter on.
 */
export default function CoursesView() {
  const { courses: allCourses, loading, error } = useApprovedCourses();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [kind, setKind] = useState<KindFilter>(searchParams.get("type") === "group" ? "group" : "all");
  const groupOnly = kind === "group";
  const courses = useMemo(
    () =>
      kind === "all"
        ? allCourses
        : allCourses.filter((c) => isGroupType(c.type) === (kind === "group")),
    [allCourses, kind],
  );

  // The top-bar search can change `?q=` while this tab is open: follow it.
  const [query, setQuery] = useState(urlQ);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    setQuery(urlQ);
  }

  const [subject, setSubject] = useState("All");
  const [enrolling, setEnrolling] = useState<ParentCourse | null>(null);

  const subjects = useMemo(
    () => [
      "All",
      ...[...new Set(courses.map((c) => c.subject).filter((s): s is string => !!s))].sort(),
    ],
    [courses],
  );
  const activeSubject = subjects.includes(subject) ? subject : "All";

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (activeSubject !== "All" && c.subject !== activeSubject) return false;
      if (!q) return true;
      return [c.courseTitle, c.subject, c.grade, c.board, teacherDisplayName(c.teacher)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [courses, query, activeSubject]);

  return (
    <div>
      <div className="relative mt-5 mb-3">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pd-ink3"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses or teachers"
          aria-label="Search courses"
          className={PD_SEARCH_INPUT}
        />
      </div>

      <div role="group" aria-label="Class type" className="mb-3 flex flex-wrap gap-2">
        {KIND_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={kind === o.key}
            onClick={() => setKind(o.key)}
            className={pillFilter(kind === o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {subjects.length > 1 && (
        <div role="group" aria-label="Subject" className="mb-4 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={activeSubject === s}
              onClick={() => setSubject(s)}
              className={pillFilter(activeSubject === s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-pd-red-bg px-4 py-3 text-sm font-semibold text-pd-red">
          {error}
        </p>
      )}

      {loading ? (
        <GridSkeleton />
      ) : list.length === 0 ? (
        <PdEmpty
          icon={SearchX}
          title={
            courses.length === 0
              ? groupOnly
                ? "No group classes yet"
                : "No courses yet"
              : "No courses match"
          }
          text={
            courses.length === 0
              ? groupOnly
                ? "Group classes appear here once teachers publish them and our team approves them."
                : "Courses appear here once teachers publish them and our team approves them. You can also request a custom class."
              : "Try another class type, subject or search term, or request a custom class."
          }
          action={
            <Link href="/parent/courses?tab=request" className={PD_BTN_SEC}>
              Request a class
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3">
          {list.map((c) => (
            <CourseCard key={c.id} course={c} onEnroll={() => setEnrolling(c)} />
          ))}
        </div>
      )}

      {enrolling && <CourseEnrollDialog course={enrolling} onClose={() => setEnrolling(null)} />}
    </div>
  );
}
