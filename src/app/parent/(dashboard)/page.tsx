"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Sparkles, Users2, BookOpenCheck } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import { useStudents } from "@/features/parent/hooks/useStudents";
import CourseCard from "@/features/parent/components/CourseCard";
import StudentCard from "@/features/parent/components/StudentCard";
import AddChildCard from "@/features/parent/components/AddChildCard";
import LearnerSwitcher, {
  type LearnerFilter,
} from "@/features/parent/components/LearnerSwitcher";
import ChildFocusCard from "@/features/parent/components/ChildFocusCard";

export default function ParentHome() {
  const { courses, loading, error } = useApprovedCourses();
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
  } = useStudents();

  const [activeLearner, setActiveLearner] = useState<LearnerFilter>("all");

  // If the currently-selected child gets removed elsewhere, the id
  // simply won't match anyone in `students` anymore - activeStudent
  // falls back to null and the page renders the "All" view without
  // needing to force-reset the switcher's own selection state.
  const activeStudent =
    activeLearner === "all"
      ? null
      : students.find((s) => s.id === activeLearner) ?? null;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">
          Home
        </p>
      </div>

      {/* LEARNER SWITCHER */}
      {!studentsLoading && students.length > 0 && (
        <LearnerSwitcher
          students={students}
          active={activeLearner}
          onSelect={setActiveLearner}
        />
      )}

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-violet-800 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 mb-10 shadow-playful">
        {/* Decorative dotted texture, kept subtle so it reads as
            "playful pattern" rather than clutter behind the copy */}
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern text-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/20 blur-2xl" />

        <div className="relative flex-1">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-3">
            <Sparkles size={13} className="text-brand-yellow" />
            One-on-one learning
          </span>

          <h1 className="font-heading text-xl sm:text-3xl font-bold text-white leading-snug">
            Unlock the power of personalized learning, tailored just for
            your child
          </h1>

          <p className="text-sm text-white/85 mt-3 max-w-lg">
            Personalized one-on-one academic classes with budget-friendly
            options and top faculty guidance — built around how your
            child actually learns.
          </p>

          <p className="text-sm text-white/85 mt-2 max-w-lg">
            Invest in their future today and start a transformative
            learning journey now.
          </p>
        </div>

        <div className="relative w-full md:w-56 h-40 rounded-2xl bg-white/10 border border-white/20 flex-shrink-0 flex items-center justify-center">
          <BookOpenCheck size={56} className="text-white/70" strokeWidth={1.3} />
        </div>
      </div>

      {/* YOUR CHILDREN — full grid when "All" is active, a single
          focused summary when one child is selected in the switcher */}
      {activeStudent ? (
        <ChildFocusCard student={activeStudent} />
      ) : (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
                <Users2 size={18} />
              </span>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-800 flex items-center gap-2">
                  Your Children
                  {!studentsLoading && students.length > 0 && (
                    <span className="text-xs font-bold text-brand bg-violet-100 px-2 py-0.5 rounded-full">
                      {students.length}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500">
                  Manage each child&apos;s profile, and enroll them in
                  classes once you find the right course below.
                </p>
              </div>
            </div>
          </div>

          {studentsError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
              {studentsError}
            </div>
          )}

          {studentsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse min-h-[13.5rem]"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
              <p className="text-gray-500 mb-4">
                You haven&apos;t added a child profile yet — add one to start
                browsing and (soon) enrolling them in courses.
              </p>
              <div className="max-w-[220px] mx-auto">
                <AddChildCard />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}

              <AddChildCard />
            </div>
          )}
        </section>
      )}

      {/* ACTIVE COURSES */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <BookOpenCheck size={18} />
          </span>
          <h2 className="font-heading text-lg font-bold text-gray-800">
            {activeStudent
              ? `Courses for ${activeStudent.visibleName || activeStudent.firstName}`
              : "Active courses"}
          </h2>
        </div>

        {/* Enrollment isn't modeled yet (03-DATA-MODEL.md), so
            there's no real link between a Student and a course
            they're taking. The switcher can't filter courses by
            child until that exists - be upfront about that here
            instead of implying a filter that isn't really happening. */}
        {activeStudent && (
          <div className="flex items-start gap-2 bg-sky-50 text-sky-700 text-sm rounded-2xl p-3 mb-4 border border-sky-100">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Course enrollment isn&apos;t linked to a specific child yet, so
              this shows everything available — once enrollment is live,
              this list will scope to what {activeStudent.visibleName || activeStudent.firstName} is actually taking.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-violet-100 bg-violet-50/60 animate-pulse min-h-[19rem]"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500">
              No courses are available yet. Check back once teachers have
              published courses and Admin has approved them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course) => (
              <Link key={course.id} href={`/parent/courses/${course.id}`}>
                <CourseCard course={course} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
