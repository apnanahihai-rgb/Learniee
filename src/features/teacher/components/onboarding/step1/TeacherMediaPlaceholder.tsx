"use client";

import { useEffect, useState } from "react";

interface TeacherMediaPlaceholderProps {
  profilePhoto: File | null;
  introVideo: File | null;

  existingProfilePhoto?: {
    originalFileName: string;
  } | null;

  existingIntroVideo?: {
    originalFileName: string;
  } | null;

  onProfilePhotoChange: (file: File | null) => void;
  onIntroVideoChange: (file: File | null) => void;

  errors?: {
    profilePhoto?: string;
    introVideo?: string;
  };
}

export default function TeacherMediaPlaceholder({
  profilePhoto,
  introVideo,
  existingProfilePhoto,
  existingIntroVideo,
  onProfilePhotoChange,
  onIntroVideoChange,
  errors,
}: TeacherMediaPlaceholderProps) {
  const [profilePhotoPreview, setProfilePhotoPreview] =
    useState<string | null>(null);

  const [introVideoPreview, setIntroVideoPreview] =
    useState<string | null>(null);

  /*
   * Create preview URL for newly selected profile photo.
   */
  useEffect(() => {
    if (!profilePhoto) {
      setProfilePhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(profilePhoto);

    setProfilePhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [profilePhoto]);

  /*
   * Create preview URL for newly selected intro video.
   */
  useEffect(() => {
    if (!introVideo) {
      setIntroVideoPreview(null);
      return;
    }

    const url = URL.createObjectURL(introVideo);

    setIntroVideoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [introVideo]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* ================================================== */}
      {/* INTRO VIDEO */}
      {/* ================================================== */}

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Video Introduction
        </label>

        <label
          htmlFor="intro-video"
          className="border-2 border-dashed rounded-md p-5 text-sm text-gray-500 bg-gray-50 cursor-pointer block hover:bg-gray-100"
        >
          <input
            id="intro-video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              onIntroVideoChange(
                e.target.files?.[0] ?? null
              );
            }}
          />

          {introVideoPreview ? (
            <div className="space-y-3">
              <video
                src={introVideoPreview}
                controls
                className="w-full max-h-64 rounded-md"
              />

              <p className="text-purple-600 font-medium break-all">
                {introVideo?.name}
              </p>

              <p className="text-xs text-gray-500">
                Preview of selected video
              </p>
            </div>
          ) : existingIntroVideo ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium break-all">
                Existing:{" "}
                {existingIntroVideo.originalFileName}
              </p>

              <p className="text-xs text-gray-500">
                Previously uploaded video
              </p>
            </div>
          ) : (
            <p>Click to upload video</p>
          )}

          <span className="block text-xs mt-2">
            MP4, WebM, MOV | Max 50MB
          </span>
        </label>

        {errors?.introVideo && (
          <p className="text-xs text-red-600 mt-1">
            {errors.introVideo}
          </p>
        )}
      </div>

      {/* ================================================== */}
      {/* PROFILE PHOTO */}
      {/* ================================================== */}

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Profile Photo
        </label>

        <label
          htmlFor="profile-photo"
          className="border-2 border-dashed rounded-md p-5 text-sm text-gray-500 bg-gray-50 cursor-pointer block hover:bg-gray-100"
        >
          <input
            id="profile-photo"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              onProfilePhotoChange(
                e.target.files?.[0] ?? null
              );
            }}
          />

          {profilePhotoPreview ? (
            <div className="space-y-3">
              <img
                src={profilePhotoPreview}
                alt="Profile photo preview"
                className="w-40 h-40 object-cover rounded-md mx-auto"
              />

              <p className="text-purple-600 font-medium break-all text-center">
                {profilePhoto?.name}
              </p>

              <p className="text-xs text-gray-500 text-center">
                Preview of selected photo
              </p>
            </div>
          ) : existingProfilePhoto ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium break-all">
                Existing:{" "}
                {existingProfilePhoto.originalFileName}
              </p>

              <p className="text-xs text-gray-500">
                Previously uploaded photo
              </p>
            </div>
          ) : (
            <p>Click to upload photo</p>
          )}

          <span className="block text-xs mt-2">
            PNG, JPG | Max 50MB
          </span>
        </label>

        {errors?.profilePhoto && (
          <p className="text-xs text-red-600 mt-1">
            {errors.profilePhoto}
          </p>
        )}
      </div>
    </div>
  );
}