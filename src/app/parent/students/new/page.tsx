"use client";

import { useRouter } from "next/navigation";

import { useStudents } from "@/features/parent/hooks/useStudents";
import StudentForm from "@/features/parent/components/StudentForm";

export default function AddStudentPage() {
  const { saving, addStudent } = useStudents();
  const router = useRouter();

  async function handleSubmit(
    data: Parameters<typeof addStudent>[0],
  ) {
    await addStudent(data);
    router.push("/parent/students");
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold text-center mb-6">
        Add a student profile
      </h1>
      <StudentForm saving={saving} onSubmit={handleSubmit} />
    </div>
  );
}
