"use client";

import { useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";

interface Props {
  courseTitle: string;
  thumbnailUrl: string | null;
  introVideoUrl: string | null;
}

/**
 * The course's thumbnail image, with a play button that swaps in
 * the intro video (if the teacher uploaded one) when clicked.
 * Falls back to a plain icon placeholder when there's no thumbnail
 * at all yet.
 */
export default function CourseMediaPanel({
  courseTitle,
  thumbnailUrl,
  introVideoUrl,
}: Props) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-100 shadow-sm">
      {showVideo && introVideoUrl ? (
        <video
          src={introVideoUrl}
          controls
          autoPlay
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
      ) : (
        <>
          {thumbnailUrl ? (
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

          {introVideoUrl && (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-colors group"
            >
              <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-playful group-hover:scale-105 transition-transform">
                <PlayCircle size={34} className="text-brand" />
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
