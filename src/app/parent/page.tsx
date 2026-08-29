"use client";

import { useState } from "react";
import { Info } from "lucide-react";

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
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-purple-600 font-medium">Home</p>
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
      <div className="border-2 border-blue-400 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-10">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug">
            Unlock the Power of Personalized Learning: Learnie&apos;s
            One-on-One Academic Classes Tailored Specifically for Your
            Child&apos;s Needs
          </h1>

          <p className="text-sm text-gray-500 mt-3">
            Unlock your child&apos;s potential with personalized one-on-one
            academic classes on our website. Choose budget-friendly options
            and nurture brilliance with top faculty guidance.
          </p>

          <p className="text-sm text-gray-500 mt-3">
            Invest in their future today and start a transformative learning
            journey now.
          </p>
        </div>

        <div className="w-full md:w-64 h-40 bg-gray-100 rounded-xl flex-shrink-0" />
      </div>

      {/* YOUR CHILDREN — full grid when "All" is active, a single
          focused summary when one child is selected in the switcher */}
      {activeStudent ? (
        <ChildFocusCard student={activeStudent} />
      ) : (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                Your Children
                {!studentsLoading && students.length > 0 && (
                  <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                    {students.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                Manage each child&apos;s profile, and enroll them in classes
                once you find the right course below.
              </p>
            </div>
          </div>

          {studentsError && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-sm">
              {studentsError}
            </div>
          )}

          {studentsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border bg-gray-50 animate-pulse min-h-[13.5rem]"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white border border-dashed rounded-2xl p-8 text-center">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
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
          <div className="flex items-start gap-2 bg-blue-50 text-blue-700 text-sm rounded-lg p-3 mb-4">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Course enrollment isn&apos;t linked to a specific child yet, so
              this shows everything available — once enrollment is live,
              this list will scope to what {activeStudent.visibleName || activeStudent.firstName} is actually taking.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading courses...</p>
        ) : courses.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              No courses are available yet. Check back once teachers have
              published courses and Admin has approved them.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
