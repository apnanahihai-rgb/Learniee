"use client";

import { useEffect, useState } from "react";
import type { AdminTeacher } from "@/features/admin/types/teacher";

export function useTeachersList() {
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/teachers");

      if (!res.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const data = await res.json();
      setTeachers(data.teachers);
    } catch (err) {
      console.error(err);
      setError("Unable to load teachers.");
    } finally {
      setLoading(false);
    }
  }

  async function updateApproval(teacherId: string, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update approval");
      }

      // Remove the teacher from the pending list
      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherId));
    } catch (err) {
      console.error(err);
      setError("Failed to update teacher approval status.");
    }
  }

  return { teachers, loading, error, updateApproval };
}
