"use client";

import { useEffect, useState } from "react";

interface CourseMediaUploadProps {
  thumbnail: File | null;
  introVideo: File | null;
  onThumbnailChange: (file: File | null) => void;
  onIntroVideoChange: (file: File | null) => void;
}

interface UploadBoxProps {
  label: string;
  accept: string;
  file: File | null;
  type: "image" | "video";
  onChange: (file: File | null) => void;
}

function UploadBox({
  label,
  accept,
  file,
  type,
  onChange,
}: UploadBoxProps) {
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
      </label>

      <label className="border-2 border-dashed border-gray-400 rounded-xl min-h-40 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition overflow-hidden">

        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            onChange(
              e.target.files?.[0] ?? null,
            );

            e.target.value = "";
          }}
        />

        {file && previewUrl ? (
          <div className="w-full p-4">

            {/* IMAGE PREVIEW */}
            {type === "image" && (
              <div className="w-full flex justify-center">
                <img
                  src={previewUrl}
                  alt="Course thumbnail preview"
                  className="max-h-56 max-w-full rounded-lg object-contain"
                />
              </div>
            )}

            {/* VIDEO PREVIEW */}
            {type === "video" && (
              <video
                src={previewUrl}
                controls
                className="w-full max-h-56 rounded-lg bg-black"
              />
            )}

            {/* FILE INFORMATION */}
            <div className="mt-4 text-center">
              <p className="text-purple-600 font-medium text-sm break-all">
                {file.name}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>

              <p className="text-xs text-purple-500 mt-2">
                Click to replace
              </p>
            </div>

          </div>
        ) : (
          <>
            <p className="text-gray-500">
              Drag files or upload
            </p>

            <span className="mt-3 px-5 py-1.5 border border-purple-500 rounded-full text-sm text-purple-600">
              Browse files
            </span>

            <p className="text-xs text-gray-500 mt-3">
              Max file size: 50MB
            </p>
          </>
        )}

      </label>
    </div>
  );
}

export default function CourseMediaUpload({
  thumbnail,
  introVideo,
  onThumbnailChange,
  onIntroVideoChange,
}: CourseMediaUploadProps) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Course Media
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <UploadBox
          label="Course Thumbnail"
          accept="image/png,image/jpeg"
          type="image"
          file={thumbnail}
          onChange={onThumbnailChange}
        />

        <UploadBox
          label="Course Intro Video"
          accept="video/mp4,video/webm,video/quicktime"
          type="video"
          file={introVideo}
          onChange={onIntroVideoChange}
        />

      </div>
    </section>
  );
}