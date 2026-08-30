"use client";

import { useState } from "react";
import { MapPin, PlayCircle } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { ParentCourseDetailTeacher } from "@/features/parent/types/courseDetail";

interface Props {
  teacher: ParentCourseDetailTeacher;
}

export default function TeacherProfileCard({ teacher }: Props) {
  const [showVideo, setShowVideo] = useState(false);

  const teacherName =
    teacher.visibleName || `${teacher.firstName} ${teacher.lastName}`.trim();

  const location = [teacher.city, teacher.country].filter(Boolean).join(", ");

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-gray-800 mb-4">
        Meet the teacher
      </h2>

      <div className="flex items-start gap-4">
        <ChildAvatar src={teacher.photoUrl} name={teacherName || "Teacher"} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-gray-800 truncate">
            {teacherName || "Teacher"}
          </p>

          {location && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <MapPin size={12} />
              {location}
            </p>
          )}

          {teacher.introVideoUrl && !showVideo && (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-brand bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <PlayCircle size={14} />
              Watch teacher intro
            </button>
          )}
        </div>
      </div>

      {teacher.introVideoUrl && showVideo && (
        <video
          src={teacher.introVideoUrl}
          controls
          autoPlay
          className="w-full mt-4 rounded-2xl bg-black aspect-video object-cover"
        />
      )}

      {teacher.aboutMe && (
        <p className="text-sm text-gray-600 mt-4 leading-relaxed whitespace-pre-line">
          {teacher.aboutMe}
        </p>
      )}
    </div>
  );
}
