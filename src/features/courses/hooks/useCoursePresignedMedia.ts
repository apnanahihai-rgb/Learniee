"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fetches a course's presigned thumbnail URL on mount, and its
 * presigned intro-video URL lazily on first hover (only if the course
 * actually has an intro video). Also handles play/pause of the video
 * element as `hovered` changes.
 *
 * Extracted out of CourseCard.tsx, which used to inline all three of
 * these effects directly in the component (~150 lines of the file).
 */
export function useCoursePresignedMedia(courseId: string, hasIntroVideo: boolean) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load thumbnail on mount.
  useEffect(() => {
    let cancelled = false;

    async function loadThumbnail() {
      try {
        setThumbnailLoading(true);

        const res = await fetch(
          `/api/teacher/course/media?courseId=${encodeURIComponent(courseId)}&type=thumbnail`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load thumbnail.");
        }

        if (!cancelled) {
          setThumbnailUrl(data.url);
        }
      } catch (error) {
        console.error("Thumbnail load error:", error);
      } finally {
        if (!cancelled) {
          setThumbnailLoading(false);
        }
      }
    }

    loadThumbnail();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Load intro video lazily, only once hovered.
  useEffect(() => {
    if (!hovered || !hasIntroVideo || videoUrl) {
      return;
    }

    let cancelled = false;

    async function loadVideo() {
      try {
        setVideoLoading(true);

        const res = await fetch(
          `/api/teacher/course/media?courseId=${encodeURIComponent(courseId)}&type=video`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load intro video.");
        }

        if (!cancelled) {
          setVideoUrl(data.url);
        }
      } catch (error) {
        console.error("Intro video load error:", error);
      } finally {
        if (!cancelled) {
          setVideoLoading(false);
        }
      }
    }

    loadVideo();
    return () => {
      cancelled = true;
    };
  }, [hovered, courseId, hasIntroVideo, videoUrl]);

  // Play/pause the video element as hover state changes.
  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (hovered && videoUrl) {
      videoRef.current.play().catch((error) => {
        // AbortError fires when hovering on/off quickly interrupts an
        // in-flight play() with pause() — expected browser behavior,
        // not a real failure. See: https://goo.gl/LdLk22
        if (error?.name !== "AbortError") {
          console.error("Video autoplay error:", error);
        }
      });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hovered, videoUrl]);

  return {
    thumbnailUrl,
    videoUrl,
    hovered,
    setHovered,
    thumbnailLoading,
    videoLoading,
    videoRef,
  };
}
