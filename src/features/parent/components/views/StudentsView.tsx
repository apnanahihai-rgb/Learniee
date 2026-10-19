"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { useStudents } from "@/features/parent/hooks/useStudents";
import StudentCard from "@/features/parent/components/StudentCard";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** "Students" tab of Account — the child profiles on this parent account. */
export default function StudentsView() {
  const { students, loading, error } = useStudents();

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-purple-600 sm:text-3xl">Students</h1>
            <p className="mt-1 text-gray-500">
              Your children&apos;s profiles. Open one to see details or remove it.
            </p>
          </div>
          <Link
            href="/parent/students/new"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            <Plus size={15} />
            Add a learner
          </Link>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-600">Loading students…</p>
        ) : students.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">You haven&apos;t added a child profile yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
