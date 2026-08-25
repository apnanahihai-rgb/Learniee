"use client";

import { useTeachersList } from "@/features/admin/hooks/useTeachersList";
import TeacherApprovalCard from "@/features/admin/components/TeacherApprovalCard";

export default function AdminTeachersPage() {
  const { teachers, loading, error, updateApproval } = useTeachersList();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading teachers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Teacher Approvals</h1>
          <p className="text-gray-500 mt-1">Review complete teacher onboarding information.</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {teachers.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No teachers are waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {teachers.map((teacher) => (
              <TeacherApprovalCard
                key={teacher.id}
                teacher={teacher}
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
