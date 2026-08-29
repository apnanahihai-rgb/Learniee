"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import { useStudents } from "@/features/parent/hooks/useStudents";
import CourseCard from "@/features/parent/components/CourseCard";
import StudentCard from "@/features/parent/components/StudentCard";

export default function ParentHome() {
  const { courses, loading, error } = useApprovedCourses();
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
  } = useStudents();

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-purple-600 font-medium">Home</p>
      </div>

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

      {/* YOUR CHILDREN */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Your Children
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
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}

            <Link
              href="/parent/students/new"
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-colors min-h-[10.5rem]"
            >
              <Plus size={22} />
              <span className="text-sm font-medium">Add child</span>
            </Link>
          </div>
        )}
      </section>

      {/* ACTIVE COURSES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Active courses
          </h2>
        </div>

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