"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useStudents } from "@/features/parent/hooks/useStudents";
import StudentForm from "@/features/parent/components/StudentForm";

export default function AddStudentPage() {
  const { saving, addStudent } = useStudents();
  const router = useRouter();

  async function handleSubmit(
    data: Parameters<typeof addStudent>[0],
  ) {
    await addStudent(data);
    router.push("/parent");
  }

  return (
    <div className="max-w-2xl mx-auto p-5 sm:p-8">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="bg-white border rounded-2xl p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-800 text-center">
          Add your child&apos;s profile
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-8">
          This helps teachers tailor classes to your child&apos;s needs.
        </p>

        <StudentForm saving={saving} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
