"use client";

import { useRouter } from "next/navigation";
import { useTeacherCourses } from "@/features/courses/hooks/useTeacherCourses";
import { useEffect, useRef, useState } from "react";
import CourseCard from "@/features/courses/components/CourseCard";
export default function TeacherCourseManagementPage() {
  const router = useRouter();

  const {
    courses,
    loading,
    error,
  } = useTeacherCourses();

  const approvedCourses = courses.filter(
    (course) => course.status === "APPROVED",
  );

  const coursesUnderReview = courses.filter(
    (course) => course.status === "UNDER_REVIEW",
  );

  if (loading) {
    return (
      <div className="p-5 sm:p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">
            Loading courses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-600">
              Course Management
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your courses and create new ones.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/teacher/course-management/new",
              )
            }
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            + Create Course
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* APPROVED COURSES */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Approved Courses
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Courses approved by the admin.
              </p>
            </div>

            <span className="text-sm font-medium text-green-600">
              {approvedCourses.length}{" "}
              {approvedCourses.length === 1
                ? "Course"
                : "Courses"}
            </span>
          </div>

          {approvedCourses.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-700">
                No approved courses
              </h3>

              <p className="text-gray-500 mt-2">
                Courses approved by the admin will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedCourses.map((course) => (
                <CourseCard
  key={course.id}
  course={course}
  status="APPROVED"
/>
              ))}
            </div>
          )}
        </section>

        {/* COURSES UNDER EXAMINATION */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Courses Under Examination
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Courses waiting for admin approval.
              </p>
            </div>

            <span className="text-sm font-medium text-orange-600">
              {coursesUnderReview.length}{" "}
              {coursesUnderReview.length === 1
                ? "Course"
                : "Courses"}
            </span>
          </div>

          {coursesUnderReview.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-700">
                No courses under examination
              </h3>

              <p className="text-gray-500 mt-2">
                Newly submitted courses will appear here until the admin reviews them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesUnderReview.map((course) => (
                <CourseCard
  key={course.id}
  course={course}
  status="UNDER_REVIEW"
/>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

