"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudentFormInput } from "@/features/parent/server/student.service";
import type { StudentProfile } from "@/features/parent/types/student";

export function useStudents() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/parent/students", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load student profiles.");
      }

      setStudents(data.students ?? []);
    } catch (err) {
      console.error("Load students error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load student profiles.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  async function addStudent(input: StudentFormInput) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/parent/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add student profile.");
      }

      // Re-fetch rather than optimistically appending, since the
      // list response includes a freshly-issued presigned photo
      // URL that a bare POST response doesn't return.
      await loadStudents();

      return data.studentId as string;
    } catch (err) {
      console.error("Add student error:", err);

      const message =
        err instanceof Error ? err.message : "Failed to add student profile.";

      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return {
    students,
    loading,
    saving,
    error,
    addStudent,
    reloadStudents: loadStudents,
  };
}
