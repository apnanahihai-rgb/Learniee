"use client";

import { useEffect, useState } from "react";
import type { ParentCourse } from "@/features/parent/types/course";

export function useApprovedCourses() {
  const [courses, setCourses] = useState<ParentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);

      const res = await fetch("/api/parent/courses");

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

  return { courses, loading, error };
}
