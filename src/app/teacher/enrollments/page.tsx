"use client";

import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import EnrollmentApprovalCard from "@/features/teacher/components/enrollments/EnrollmentApprovalCard";

export default function TeacherEnrollmentsPage() {
  const { enrollments, loading, error, approve, reject, revise } =
    useTeacherEnrollments();

  return (
    <div className="p-5 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-600">
            Enrollments
          </h1>
          <p className="text-gray-500 mt-1">
            Review new enrollments, propose a schedule change, or reject.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading enrollments…</p>
        ) : enrollments.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No enrollments waiting on you right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <EnrollmentApprovalCard
                key={enrollment.id}
                enrollment={enrollment}
                onApprove={approve}
                onReject={reject}
                onRevise={revise}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
