"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";

export function useCreateCourse() {
  const router = useRouter();

  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function goToCourseManagement() {
    router.push("/teacher/course-management");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!formData.courseTitle.trim()) {
      setError("Course title is required.");
      return;
    }

    if (!thumbnail) {
      setError("Course thumbnail is required.");
      return;
    }

    if (!introVideo) {
      setError("Course intro video is required.");
      return;
    }

    try {
      setSaving(true);

      // 1. Upload thumbnail to S3.
      const thumbnailKey = await uploadFileToS3({ file: thumbnail, folder: "course-media" });

      // 2. Upload intro video to S3.
      const introVideoKey = await uploadFileToS3({ file: introVideo, folder: "course-media" });

      // 3. Save course data + S3 keys.
      const res = await fetch("/api/teacher/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, thumbnailKey, introVideoKey }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create course.");
      }

      // 4. Success.
      goToCourseManagement();
    } catch (err) {
      console.error("Create course error:", err);
      setError(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setSaving(false);
    }
  }

  return {
    formData,
    setFormData,
    thumbnail,
    setThumbnail,
    introVideo,
    setIntroVideo,
    saving,
    error,
    handleSubmit,
    goToCourseManagement,
  };
}
