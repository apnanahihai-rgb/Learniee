"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudentProfile } from "@/features/parent/types/student";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export function useStudentProfile(studentId: string) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    // Silent when run by the live-update refresh: no spinner, and a
    // failed refresh (e.g. the profile was just removed) keeps the screen.
    const background = isBackgroundRefresh();

    try {
      if (!background) {
        setLoading(true);
        setError("");
      }

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

      if (!background) {
        setError(
          err instanceof Error ? err.message : "Failed to load student profile.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  useAutoRefresh(() => loadStudent(), { paths: [`/api/parent/students/${studentId}`] });

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
