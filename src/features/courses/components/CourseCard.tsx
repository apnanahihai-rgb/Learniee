"use client";

import { useEffect, useRef, useState } from "react";

interface CourseCardProps {
  course: {
    id: string;
    courseTitle: string | null;
    subject: string | null;
    grade: string | null;
    board: string | null;
    type: string | null;
    price: string | null;
    thumbnailKey: string | null;
    introVideoKey: string | null;
    createdAt: string;
  };
  status: "APPROVED" | "UNDER_REVIEW";
}

export default function CourseCard({
  course,
  status,
}: CourseCardProps) {
  const [thumbnailUrl, setThumbnailUrl] =
    useState<string | null>(null);

  const [videoUrl, setVideoUrl] =
    useState<string | null>(null);

  const [hovered, setHovered] =
    useState(false);

  const [thumbnailLoading, setThumbnailLoading] =
    useState(true);

  const [videoLoading, setVideoLoading] =
    useState(false);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  /*
   * -----------------------------------------
   * Load thumbnail
   * -----------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadThumbnail() {
      try {
        setThumbnailLoading(true);

        const res = await fetch(
          `/api/teacher/course/media?courseId=${encodeURIComponent(
            course.id,
          )}&type=thumbnail`,
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load thumbnail.",
          );
        }

        if (!cancelled) {
          setThumbnailUrl(data.url);
        }
      } catch (error) {
        console.error(
          "Thumbnail load error:",
          error,
        );
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
  }, [course.id]);

  /*
   * -----------------------------------------
   * Load video when hovering
   * -----------------------------------------
   */

  useEffect(() => {
    if (!hovered) {
      return;
    }

    if (!course.introVideoKey) {
      return;
    }

    if (videoUrl) {
      return;
    }

    let cancelled = false;

    async function loadVideo() {
      try {
        setVideoLoading(true);

        const res = await fetch(
          `/api/teacher/course/media?courseId=${encodeURIComponent(
            course.id,
          )}&type=video`,
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load intro video.",
          );
        }

        if (!cancelled) {
          setVideoUrl(data.url);
        }
      } catch (error) {
        console.error(
          "Intro video load error:",
          error,
        );
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
  }, [
    hovered,
    course.id,
    course.introVideoKey,
    videoUrl,
  ]);

  /*
   * -----------------------------------------
   * Play / pause video
   * -----------------------------------------
   */

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (hovered && videoUrl) {
      videoRef.current
        .play()
        .catch((error) => {
          // AbortError fires when hovering on/off quickly interrupts
          // an in-flight play() with pause() — expected browser
          // behavior, not a real failure. See: https://goo.gl/LdLk22
          if (error?.name !== "AbortError") {
            console.error(
              "Video autoplay error:",
              error,
            );
          }
        });
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hovered, videoUrl]);

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">

      {/* MEDIA PREVIEW */}

      <div
        className="h-40 bg-gray-100 relative overflow-hidden"
        onMouseEnter={() =>
          setHovered(true)
        }
        onMouseLeave={() =>
          setHovered(false)
        }
      >

        {/* Thumbnail loading */}

        {thumbnailLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-400">
              Loading thumbnail...
            </p>
          </div>
        )}

        {/* Thumbnail */}

        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={
              course.courseTitle ||
              "Course thumbnail"
            }
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered && videoUrl
                ? "opacity-0"
                : "opacity-100"
            }`}
          />
        )}

        {/* Thumbnail fallback */}

        {!thumbnailLoading &&
          !thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400">
                Course Thumbnail
              </p>
            </div>
          )}

        {/* Video */}

        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            loop
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hovered
                ? "opacity-100"
                : "opacity-0"
            }`}
          />
        )}

        {/* Video loading */}

        {hovered &&
          videoLoading &&
          !videoUrl && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <p className="text-white text-sm">
                Loading preview...
              </p>
            </div>
          )}

        {/* Hover hint */}

        {!hovered &&
          course.introVideoKey && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              Hover to preview
            </div>
          )}

      </div>

      {/* COURSE CONTENT */}

      <div className="p-5">

        {/* Status */}

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

        {/* Title */}

        <h2 className="text-lg font-semibold text-gray-800">
          {course.courseTitle ||
            "Untitled Course"}
        </h2>

        {/* Details */}

        <div className="mt-3 space-y-1 text-sm text-gray-500">

          <p>
            <span className="font-medium">
              Subject:
            </span>{" "}
            {course.subject || "-"}
          </p>

          <p>
            <span className="font-medium">
              Grade:
            </span>{" "}
            {course.grade || "-"}
          </p>

          <p>
            <span className="font-medium">
              Board:
            </span>{" "}
            {course.board || "-"}
          </p>

          <p>
            <span className="font-medium">
              Type:
            </span>{" "}
            {course.type || "-"}
          </p>

          <p>
            <span className="font-medium">
              Price:
            </span>{" "}
            {course.price || "-"}
          </p>

        </div>

        {/* Created */}

        <div className="mt-5 pt-4 border-t">
          <p className="text-xs text-gray-400">
            Created{" "}
            {new Date(
              course.createdAt,
            ).toLocaleDateString()}
          </p>
        </div>

      </div>
    </div>
  );
}