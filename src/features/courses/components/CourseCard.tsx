"use client";

import { useCoursePresignedMedia } from "@/features/courses/hooks/useCoursePresignedMedia";
import CourseMediaPreview from "@/features/courses/components/CourseMediaPreview";
import type { TeacherCourseSummary } from "@/features/courses/types/course";

interface CourseCardProps {
  course: TeacherCourseSummary;
  status: "APPROVED" | "UNDER_REVIEW";
}

export default function CourseCard({ course, status }: CourseCardProps) {
  const media = useCoursePresignedMedia(course.id, Boolean(course.introVideoKey));

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <CourseMediaPreview
        courseTitle={course.courseTitle}
        hasIntroVideo={Boolean(course.introVideoKey)}
        thumbnailUrl={media.thumbnailUrl}
        thumbnailLoading={media.thumbnailLoading}
        videoUrl={media.videoUrl}
        videoLoading={media.videoLoading}
        hovered={media.hovered}
        onHoverStart={() => media.setHovered(true)}
        onHoverEnd={() => media.setHovered(false)}
        videoRef={media.videoRef}
      />

      <div className="p-5">
        <div className="mb-3">
          {status === "APPROVED" ? (
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Approved
            </span>
          ) : (
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Under Examination
            </span>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-800">
          {course.courseTitle || "Untitled Course"}
        </h2>

        <div className="mt-3 space-y-1 text-sm text-gray-500">
          <p>
            <span className="font-medium">Subject:</span> {course.subject || "-"}
          </p>
          <p>
            <span className="font-medium">Grade:</span> {course.grade || "-"}
          </p>
          <p>
            <span className="font-medium">Board:</span> {course.board || "-"}
          </p>
          <p>
            <span className="font-medium">Type:</span> {course.type || "-"}
          </p>
          <p>
            <span className="font-medium">Price:</span> {course.price || "-"}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t">
          <p className="text-xs text-gray-400">
            Created {new Date(course.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
