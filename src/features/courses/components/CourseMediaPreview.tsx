"use client";

import type { RefObject } from "react";

interface CourseMediaPreviewProps {
  courseTitle: string | null;
  hasIntroVideo: boolean;
  thumbnailUrl: string | null;
  thumbnailLoading: boolean;
  videoUrl: string | null;
  videoLoading: boolean;
  hovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}

/** The hover-to-preview thumbnail/video block at the top of a course card. */
export default function CourseMediaPreview({
  courseTitle,
  hasIntroVideo,
  thumbnailUrl,
  thumbnailLoading,
  videoUrl,
  videoLoading,
  hovered,
  onHoverStart,
  onHoverEnd,
  videoRef,
}: CourseMediaPreviewProps) {
  return (
    <div
      className="h-40 bg-gray-100 relative overflow-hidden"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {thumbnailLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-400">Loading thumbnail...</p>
        </div>
      )}

      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={courseTitle || "Course thumbnail"}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hovered && videoUrl ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {!thumbnailLoading && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">Course Thumbnail</p>
        </div>
      )}

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          loop
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {hovered && videoLoading && !videoUrl && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <p className="text-white text-sm">Loading preview...</p>
        </div>
      )}

      {!hovered && hasIntroVideo && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          Hover to preview
        </div>
      )}
    </div>
  );
}
