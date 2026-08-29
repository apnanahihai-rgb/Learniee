"use client";

import { useCallback, useEffect, useState } from "react";

import type { CourseFormData } from "@/features/courses/types/course";

export interface Course {
  id: string;
  teacherId: string;

  category: string | null;
  timeSlot: string | null;

  subject: string | null;
  grade: string | null;
  board: string | null;
  experience: string | null;

  duration: string | null;
  type: string | null;
  language: string | null;
  frequency: string | null;
  status: string | null;
  courseTitle: string | null;
  rating: number | null;
  objective: string | null;
  description: string | null;

  modules: string | null;
  courseTags: string | null;
  price: string | null;

  thumbnailKey: string | null;
  introVideoKey: string | null;

  createdAt: string;
  updatedAt: string;
}

export function useTeacherCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/course", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to load courses.",
        );
      }

      setCourses(data.courses ?? []);
    } catch (err) {
      console.error("Load courses error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load courses.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function createCourse(formData: CourseFormData) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/teacher/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to create course.",
        );
      }

      setCourses((prev) => [
        data.course,
        ...prev,
      ]);

      return data.course;
    } catch (err) {
      console.error("Create course error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Failed to create course.";

      setError(message);

      throw err;
    } finally {
      setSaving(false);
    }
  }

  return {
    courses,
    loading,
    saving,
    error,
    createCourse,
    reloadCourses: loadCourses,
  };
}