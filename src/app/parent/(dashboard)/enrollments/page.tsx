"use client";

import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import EnrollmentStatusCard from "@/features/parent/components/enrollments/EnrollmentStatusCard";

export default function ParentEnrollmentsPage() {
  const { enrollments, loading, error, respondToRevision } =
    useParentEnrollments();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">My Enrollments</h1>
        <p className="text-gray-500 mt-1">
          Track your enrollments and chat with your teacher any time.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading your enrollments…</p>
      ) : enrollments.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No enrollments yet — browse courses to enroll your child.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <EnrollmentStatusCard
              key={enrollment.id}
              enrollment={enrollment}
              onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
              onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
