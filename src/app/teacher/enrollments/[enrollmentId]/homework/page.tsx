"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import TeacherHomeworkPanel from "@/features/teacher/components/homework/TeacherHomeworkPanel";

export default function TeacherEnrollmentHomeworkPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);

  return (
    <div className="p-5 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/teacher/enrollments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={14} /> Back to enrollments
        </Link>

        <h1 className="text-2xl font-bold text-purple-600 mb-1">Homework</h1>
        <p className="text-gray-500 mb-6">
          Assign homework and review what your student submits.
        </p>

        <TeacherHomeworkPanel enrollmentId={enrollmentId} />
      </div>
    </div>
  );
}
