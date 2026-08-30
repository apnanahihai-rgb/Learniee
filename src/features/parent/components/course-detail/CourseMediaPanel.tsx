"use client";

import { BookOpen } from "lucide-react";

interface Props {
  courseTitle: string;
  thumbnailUrl: string | null;
  introVideoUrl: string | null;
}

/**
 * The course's intro video, shown inline and always visible — not
 * hidden behind a play-button click anymore. Course intro video is
 * already required at course creation (see useCreateCourse.ts), so
 * this panel now treats it the same way: compulsory, not optional,
 * to actually watch. Falls back to the thumbnail (or a plain icon
 * placeholder) only for courses created before the video became
 * mandatory and that genuinely have no video on file.
 */
export default function CourseMediaPanel({
  courseTitle,
  thumbnailUrl,
  introVideoUrl,
}: Props) {
  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-100 shadow-sm">
      {introVideoUrl ? (
        <video
          src={introVideoUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
      ) : thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={courseTitle}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen size={48} className="text-violet-300" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
