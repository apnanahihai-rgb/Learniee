"use client";

import { useState } from "react";
import { validateFile } from "@/features/shared/utils/validateFile";

export interface ExistingStep1File {
  id: string;
  type: "PROFILE_PHOTO" | "INTRO_VIDEO";
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Owns profile-photo/intro-video file selection, client-side
 * validation, and the "already uploaded" values loaded from the
 * server. Split out of useTeacherStep1Form.ts to keep that hook
 * focused on the text-field form + submit flow.
 */
export function useTeacherStep1Files() {
  const [profilePhoto, setProfilePhotoRaw] = useState<File | null>(null);
  const [introVideo, setIntroVideoRaw] = useState<File | null>(null);

  const [existingProfilePhoto, setExistingProfilePhoto] =
    useState<ExistingStep1File | null>(null);
  const [existingIntroVideo, setExistingIntroVideo] =
    useState<ExistingStep1File | null>(null);

  const [fileErrors, setFileErrors] = useState<{
    profilePhoto?: string;
    introVideo?: string;
  }>({});

  function handleProfilePhotoChange(file: File | null) {
    const error = validateFile(file, {
      allowedTypes: ["image/png", "image/jpeg"],
      allowedTypesLabel: "PNG or JPG images",
    });

    setFileErrors((prev) => ({ ...prev, profilePhoto: error }));
    setProfilePhotoRaw(error ? null : file);
  }

  function handleIntroVideoChange(file: File | null) {
    const error = validateFile(file, {
      allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
      allowedTypesLabel: "MP4, WebM or MOV videos",
    });

    setFileErrors((prev) => ({ ...prev, introVideo: error }));
    setIntroVideoRaw(error ? null : file);
  }

  /**
   * A video introduction is now required for every teacher (not
   * optional) — parents see this on the course-detail page and
   * it's the platform's unique selling point. Called from
   * useTeacherStep1Form.ts's handleSubmit when neither a newly
   * selected file nor a previously-uploaded video exists yet.
   * Reuses the same fileErrors.introVideo slot that
   * handleIntroVideoChange already renders in
   * TeacherMediaPlaceholder, so selecting a valid video afterwards
   * clears this the same way any other file error would.
   */
  function markIntroVideoRequired() {
    setFileErrors((prev) => ({
      ...prev,
      introVideo:
        "A video introduction is required — parents see this on your course pages.",
    }));
  }

  function loadExisting(files?: {
    profilePhoto?: ExistingStep1File | null;
    introVideo?: ExistingStep1File | null;
  }) {
    setExistingProfilePhoto(files?.profilePhoto ?? null);
    setExistingIntroVideo(files?.introVideo ?? null);
  }

  return {
    profilePhoto,
    introVideo,
    existingProfilePhoto,
    existingIntroVideo,
    fileErrors,
    handleProfilePhotoChange,
    handleIntroVideoChange,
    markIntroVideoRequired,
    loadExisting,
  };
}
