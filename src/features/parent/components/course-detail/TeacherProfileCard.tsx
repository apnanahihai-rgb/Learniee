"use client";

import { MapPin, Video } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { ParentCourseDetailTeacher } from "@/features/parent/types/courseDetail";

interface Props {
  teacher: ParentCourseDetailTeacher;
}

/**
 * "Meet the teacher" — the teacher's own intro video is now always
 * rendered inline, not hidden behind a "Watch teacher intro" click.
 * Teacher onboarding requires this video going forward (see
 * useTeacherStep1Form.ts), so parents should always see it here
 * without an extra tap — teachers are the platform's unique
 * selling point. Teachers who onboarded before the video became
 * mandatory may still have no video on file; that case falls back
 * to a plain notice instead of an empty gap.
 *
 * Fixed (Aug 31, 2026): teacher intro videos are commonly recorded
 * on a phone in portrait, or at a different aspect ratio than the
 * course video. Forcing that into a fixed 16:9 `object-cover` box
 * cropped out most of the frame — the video looked broken even
 * though it wasn't. Switched to a max-height container with
 * `object-contain` on a black backdrop so the whole video is
 * always visible, letterboxed/pillarboxed instead of cropped.
 */
export default function TeacherProfileCard({ teacher }: Props) {
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
        </div>
      </div>

      {teacher.introVideoUrl ? (
        <div className="relative w-full mt-4 rounded-2xl overflow-hidden bg-black h-56 sm:h-64">
          <video
            src={teacher.introVideoUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-3 py-3">
          <Video size={14} className="flex-shrink-0" />
          This teacher hasn&apos;t uploaded a video introduction yet.
        </div>
      )}

      {teacher.aboutMe && (
        <p className="text-sm text-gray-600 mt-4 leading-relaxed whitespace-pre-line">
          {teacher.aboutMe}
        </p>
      )}
    </div>
  );
}
