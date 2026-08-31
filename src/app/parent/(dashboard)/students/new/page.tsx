"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";

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
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="bg-white border border-violet-100 rounded-3xl shadow-playful p-5 sm:p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <span className="w-12 h-12 rounded-2xl bg-violet-100 text-brand flex items-center justify-center mb-3">
            <UserPlus size={22} />
          </span>
          <h1 className="font-heading text-xl font-bold text-gray-800">
            Add your child&apos;s profile
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            This helps teachers tailor classes to your child&apos;s needs.
          </p>
        </div>

        <StudentForm saving={saving} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
