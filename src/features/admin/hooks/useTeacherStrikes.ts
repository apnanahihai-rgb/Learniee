"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminTeacherStrike {
  id: string;
  teacherId: string;
  teacherName: string;
  reason: "TEACHER_NO_SHOW" | "TEACHER_CANCELLED";
  courseTitle: string | null;
  classStartsAt: string | null;
  recordedAt: string;
  /** Null while the strike counts. */
  waivedAt: string | null;
  waivedByName: string | null;
  waiveReason: string | null;
}

/** Admin's teacher-strikes list (Phase 2.6) and the waiver action. */
export function useTeacherStrikes() {
  const [strikes, setStrikes] = useState<AdminTeacherStrike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/teacher-strikes");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load teacher strikes.");
      }

      setStrikes(data.strikes ?? []);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load teacher strikes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function waive(strikeId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/teacher-strikes/${strikeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Already waived by someone else: show the current state.
        if (res.status === 409) await load();

        return { ok: false, error: data.error || "Failed to waive this strike." };
      }

      await load();

      return { ok: true };
    } catch (err) {
      console.error(err);

      return { ok: false, error: "Failed to waive this strike." };
    }
  }

  return { strikes, loading, error, waive, reload: load };
}
