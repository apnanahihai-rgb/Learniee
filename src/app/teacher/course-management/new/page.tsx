"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


import CreateCourseForm from "@/features/courses/components/CreateCourseForm";
import CourseMediaUpload from "@/features/courses/components/CourseMediaUpload";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import {
  initialCourseFormData,
  type CourseFormData,
} from "@/features/courses/types/course";

export default function NewCoursePage() {
  const router = useRouter();

  

  const [formData, setFormData] =
    useState<CourseFormData>(initialCourseFormData);

  const [thumbnail, setThumbnail] =
    useState<File | null>(null);

  const [introVideo, setIntroVideo] =
    useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
  e: React.FormEvent<HTMLFormElement>,
) {
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

    /*
     * -----------------------------------------
     * 1. Upload thumbnail to S3
     * -----------------------------------------
     */

    const thumbnailKey = await uploadFileToS3({
  file: thumbnail,
  folder: "course-media",
});

    /*
     * -----------------------------------------
     * 2. Upload intro video to S3
     * -----------------------------------------
     */

    const introVideoKey = await uploadFileToS3({
  file: introVideo,
  folder: "course-media",
});

    /*
     * -----------------------------------------
     * 3. Save course data + S3 keys
     * -----------------------------------------
     */

    const res = await fetch("/api/teacher/course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        thumbnailKey,
        introVideoKey,
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          "Failed to create course.",
      );
    }

    /*
     * -----------------------------------------
     * 4. Success
     * -----------------------------------------
     */

    router.push("/teacher/course-management");
  } catch (err) {
    console.error("Create course error:", err);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to create course.",
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="min-h-screen bg-white">

     

      <div className="flex">

        
        {/* Main Content */}
        <main className="flex-1 min-w-0 p-5 sm:p-8">
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/course-management",
                    )
                  }
                  className="hover:text-purple-600"
                >
                  Teacher
                </button>

                <span>›</span>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/teacher/course-management",
                    )
                  }
                  className="hover:text-purple-600"
                >
                  Course Management
                </button>

                <span>›</span>

                <span className="text-gray-700">
                  New Course
                </span>
              </div>

              <h1 className="text-3xl font-bold text-purple-600">
                New Course
              </h1>

              <p className="text-gray-500 mt-1">
                Create a new course and publish it for students.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700">
                {error}
              </div>
            )}

            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm">

              <form
                onSubmit={handleSubmit}
                className="space-y-10"
              >

                {/* Course Details */}
                <CreateCourseForm
                  onChange={setFormData}
                />

                {/* Course Media */}
                <CourseMediaUpload
                  thumbnail={thumbnail}
                  introVideo={introVideo}
                  onThumbnailChange={setThumbnail}
                  onIntroVideoChange={setIntroVideo}
                />

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t">

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/teacher/course-management",
                      )
                    }
                    disabled={saving}
                    className="px-7 py-3 rounded-lg border border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : "Create Course"}
                  </button>

                </div>

              </form>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}