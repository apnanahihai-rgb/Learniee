"use client";

import { useCoursesList } from "@/features/admin/hooks/useCoursesList";
import CourseApprovalCard from "@/features/admin/components/CourseApprovalCard";

export default function AdminCoursesPage() {
  const { courses, loading, error, updateApproval } = useCoursesList();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Course Approvals</h1>
          <p className="text-gray-500 mt-1">
            Review courses submitted by teachers.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {courses.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No courses are waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {courses.map((course) => (
              <CourseApprovalCard
                key={course.id}
                course={course}
                onApprove={(id) => updateApproval(id, "APPROVED")}
                onReject={(id) => updateApproval(id, "REJECTED")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
