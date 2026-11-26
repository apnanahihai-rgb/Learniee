"use client";

import { useEffect, useState } from "react";
import type { AdminCourse } from "@/features/admin/types/course";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export function useCoursesList(options: { groupOnly?: boolean } = {}) {
  const groupOnly = Boolean(options.groupOnly);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useAutoRefresh(() => fetchCourses(), { paths: ["/api/admin/courses"] });

  async function fetchCourses() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch(groupOnly ? "/api/admin/courses?type=group" : "/api/admin/courses");
      setError("");

      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await res.json();
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
      setError("Unable to load courses.");
    } finally {
      setLoading(false);
    }
  }

  async function updateApproval(
    courseId: string,
    status: "APPROVED" | "REJECTED",
  ): Promise<boolean> {
    if (busyId) return false;

    setBusyId(courseId);
    setError("");

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update approval");
      }

      // Remove the course from the pending list
      setCourses((current) => current.filter((course) => course.id !== courseId));

      return true;
    } catch (err) {
      console.error(err);
      setError("Failed to update course approval status.");

      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { courses, loading, error, busyId, updateApproval };
}
