"use client";

import { useCallback, useEffect, useState } from "react";

import type { ParentCourse } from "@/features/parent/types/course";
import type { ParentCourseDetail } from "@/features/parent/types/courseDetail";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export function useCourseDetail(courseId: string) {
  const [course, setCourse] = useState<ParentCourseDetail | null>(null);
  const [otherCourses, setOtherCourses] = useState<ParentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      return;
    }

    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/courses/${courseId}`, {
        cache: "no-store",
      });

      if (res.status === 404) {
        throw new Error(
          "This course isn't available anymore — it may have been unpublished or is still awaiting approval.",
        );
      }

      if (!res.ok) {
        throw new Error("Failed to load this course.");
      }

      const data = await res.json();

      setCourse(data.course ?? null);
      setOtherCourses(data.otherCourses ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to load this course.",
      );
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useAutoRefresh(() => loadCourse());

  return { course, otherCourses, loading, error };
}
