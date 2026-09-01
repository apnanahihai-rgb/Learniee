"use client";

import { useAdminEnrollments } from "@/features/admin/hooks/useEnrollments";
import EnrollmentApprovalCard from "@/features/admin/components/EnrollmentApprovalCard";

export default function AdminEnrollmentsPage() {
  const { enrollments, loading, error, updateApproval } = useAdminEnrollments();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading enrollments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Enrollment Approvals</h1>
          <p className="text-gray-500 mt-1">
            Enrollments the teacher has already approved — final step before a
            student is active.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {enrollments.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No enrollments are waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {enrollments.map((enrollment) => (
              <EnrollmentApprovalCard
                key={enrollment.id}
                enrollment={enrollment}
                onApprove={(id) => updateApproval(id, "APPROVE")}
                onReject={(id, reason) => updateApproval(id, "REJECT", reason)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
