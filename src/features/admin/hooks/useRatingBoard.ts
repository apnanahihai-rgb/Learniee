"use client";

import { useCallback, useEffect, useState } from "react";

import type { RatingBoardCourse, RatingBoardTeacher } from "@/features/admin/server/ratingBoard.service";

// Types only: `import type` is erased at build time, so no server code reaches the browser.
export type { RatingBoardCourse, RatingBoardTeacher };

interface DeleteResult {
  ok: boolean;
  error?: string;
  loginRemoved?: boolean;
}

/** Admin "Lowest rated" list (courses + teachers) and the two delete actions. */
export function useRatingBoard() {
  const [courses, setCourses] = useState<RatingBoardCourse[]>([]);
  const [teachers, setTeachers] = useState<RatingBoardTeacher[]>([]);
  const [bottomPercent, setBottomPercent] = useState(2);
  const [minReviews, setMinReviews] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rating-board");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load ratings.");

      setCourses(data.courses ?? []);
      setTeachers(data.teachers ?? []);
      setBottomPercent(data.bottomPercent ?? 2);
      setMinReviews(data.minReviews ?? 3);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load ratings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(kind: "courses" | "teachers", id: string, reason: string): Promise<DeleteResult> {
    try {
      const res = await fetch(`/api/admin/rating-board/${kind}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Already gone, or its state changed: show the current list.
        if (res.status === 404 || res.status === 409) await load();

        return { ok: false, error: data.error || "Delete failed." };
      }

      await load();

      return { ok: true, loginRemoved: data.loginRemoved };
    } catch (err) {
      console.error(err);

      return { ok: false, error: "Delete failed." };
    }
  }

  return {
    courses,
    teachers,
    bottomPercent,
    minReviews,
    loading,
    error,
    deleteCourse: (id: string, reason: string) => remove("courses", id, reason),
    deleteTeacher: (id: string, reason: string) => remove("teachers", id, reason),
  };
}
