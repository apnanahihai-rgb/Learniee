"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useCourseDetail } from "@/features/parent/hooks/useCourseDetail";
import CourseMediaPanel from "@/features/parent/components/course-detail/CourseMediaPanel";
import CourseInfoSection from "@/features/parent/components/course-detail/CourseInfoSection";
import TeacherProfileCard from "@/features/parent/components/course-detail/TeacherProfileCard";
import BookingPanel from "@/features/parent/components/course-detail/BookingPanel";
import ReviewsSection from "@/features/parent/components/course-detail/ReviewsSection";
import OtherCoursesByTeacher from "@/features/parent/components/course-detail/OtherCoursesByTeacher";

/**
 * Full course-detail page for a Parent: course media, details,
 * teacher profile, a date/time booking preview, sample reviews,
 * and other courses by the same teacher. Reachable by clicking a
 * course card on /parent.
 *
 * Demo/Enrollment booking is UI-only for now (see BookingPanel) —
 * Enrollment and DemoCoupon aren't modeled yet. Reviews are also
 * UI-only placeholder content (see ReviewsSection) — Reviews are
 * Month 2 scope, not MVP.
 */
export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const { course, otherCourses, loading, error } = useCourseDetail(
    params.courseId,
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-6 w-32 bg-violet-100 rounded-full" />
          <div className="aspect-video w-full bg-violet-100 rounded-3xl" />
          <div className="h-24 bg-violet-50 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <p className="text-red-600 mb-4">
          {error || "This course couldn't be found."}
        </p>
        <Link href="/parent" className="text-brand underline text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const teacherName =
    course.teacher.visibleName ||
    `${course.teacher.firstName} ${course.teacher.lastName}`.trim() ||
    "this teacher";

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <CourseMediaPanel
            courseTitle={course.courseTitle || "Course"}
            thumbnailUrl={course.thumbnailUrl}
            introVideoUrl={course.introVideoUrl}
          />

          <CourseInfoSection course={course} />

          <TeacherProfileCard teacher={course.teacher} />

          <ReviewsSection />
        </div>

        {/* BOOKING SIDEBAR */}
        <div className="lg:col-span-1">
          <BookingPanel price={course.price} />
        </div>
      </div>

      <OtherCoursesByTeacher teacherName={teacherName} courses={otherCourses} />
    </div>
  );
}
