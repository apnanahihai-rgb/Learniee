"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudentProfile } from "@/features/parent/types/student";

export function useStudentProfile(studentId: string) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/students/${studentId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load student profile.");
      }

      setStudent(data.student ?? null);
    } catch (err) {
      console.error("Load student error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load student profile.",
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  async function removeStudent() {
    try {
      setRemoving(true);
      setError("");

      const res = await fetch(`/api/parent/students/${studentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove student profile.");
      }

      return true;
    } catch (err) {
      console.error("Remove student error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove student profile.",
      );

      return false;
    } finally {
      setRemoving(false);
    }
  }

  return { student, loading, removing, error, removeStudent };
}
