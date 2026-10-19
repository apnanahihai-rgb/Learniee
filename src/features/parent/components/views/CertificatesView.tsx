"use client";

import { useStudents } from "@/features/parent/hooks/useStudents";
import StudentCertificates from "@/features/parent/components/StudentCertificates";

/**
 * "Certificates" tab of My Classes. Reuses the card from the student page,
 * one per child; a child with no issued certificate shows nothing.
 */
export default function CertificatesView() {
  const { students, loading } = useStudents();

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-purple-600 sm:text-3xl">Certificates</h1>
        <p className="mb-6 mt-1 text-gray-500">
          Certificates your children have earned appear here once a teacher
          issues them.
        </p>

        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : (
          students.map((student) => (
            <StudentCertificates key={student.id} studentId={student.id} />
          ))
        )}
      </div>
    </div>
  );
}
