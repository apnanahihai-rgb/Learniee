"use client";

import { useEffect, useState } from "react";
import type { AdminCourse } from "@/features/admin/types/course";

export function useCoursesList() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/courses");

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
  ) {
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
    } catch (err) {
      console.error(err);
      setError("Failed to update course approval status.");
    }
  }

  return { courses, loading, error, updateApproval };
}
