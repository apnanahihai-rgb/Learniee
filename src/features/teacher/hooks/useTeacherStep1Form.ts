"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Step1FormData } from "@/features/teacher/server/step1.service";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

const emptyFormData: Step1FormData = {
  firstName: "",
  lastName: "",
  email: "",

  visibleName: "",

  dobDay: "",
  dobMonth: "",
  dobYear: "",

  gender: "",
  nationality: "",

  address: "",
  city: "",
  country: "",
  pincode: "",

  phone: "",
  whatsapp: "",

  aboutMe: "",
  criminalCase: "",
};

interface ExistingFile {
  id: string;
  type: "PROFILE_PHOTO" | "INTRO_VIDEO";
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export function useTeacherStep1Form() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] =
    useState<Step1FormData>(emptyFormData);

  const [teacherId, setTeacherId] =
    useState<string | null>(null);

  const [profilePhoto, setProfilePhoto] =
    useState<File | null>(null);

  const [introVideo, setIntroVideo] =
    useState<File | null>(null);

  const [existingProfilePhoto, setExistingProfilePhoto] =
    useState<ExistingFile | null>(null);

  const [existingIntroVideo, setExistingIntroVideo] =
    useState<ExistingFile | null>(null);

  const [fileErrors, setFileErrors] = useState<{
    profilePhoto?: string;
    introVideo?: string;
  }>({});

  async function loadTeacherData() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/teacher/onboarding/step1",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to load teacher information"
        );
      }

      const data = await res.json();

      setFormData(data.formData);

      if (data.teacherId) {
        setTeacherId(data.teacherId);
        localStorage.setItem(
          "teacherId",
          data.teacherId
        );
      }

      /*
       * Existing Step 1 files from TeacherFile.
       */
      if (data.files) {
        setExistingProfilePhoto(
          data.files.profilePhoto ?? null
        );

        setExistingIntroVideo(
          data.files.introVideo ?? null
        );
      }
    } catch (error) {
      console.error(
        "Failed to load Step 1:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeacherData();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function validateProfilePhoto(
    file: File | null
  ) {
    if (!file) {
      return "";
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only PNG or JPG images are allowed.";
    }

    if (file.size > 50 * 1024 * 1024) {
      return "Profile photo must be under 50MB.";
    }

    return "";
  }

  function validateIntroVideo(
    file: File | null
  ) {
    if (!file) {
      return "";
    }

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only MP4, WebM or MOV videos are allowed.";
    }

    if (file.size > 50 * 1024 * 1024) {
      return "Introduction video must be under 50MB.";
    }

    return "";
  }

  function handleProfilePhotoChange(
    file: File | null
  ) {
    const error =
      validateProfilePhoto(file);

    setFileErrors((prev) => ({
      ...prev,
      profilePhoto: error,
    }));

    if (!error) {
      setProfilePhoto(file);
    } else {
      setProfilePhoto(null);
    }
  }

  function handleIntroVideoChange(
    file: File | null
  ) {
    const error =
      validateIntroVideo(file);

    setFileErrors((prev) => ({
      ...prev,
      introVideo: error,
    }));

    if (!error) {
      setIntroVideo(file);
    } else {
      setIntroVideo(null);
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (fileErrors.profilePhoto) {
      return;
    }

    if (fileErrors.introVideo) {
      return;
    }

    setSubmitting(true);

    try {
      /*
       * ------------------------------------------------------
       * 1. Save personal information first.
       * ------------------------------------------------------
       *
       * This also creates the Teacher record if necessary.
       */
      const teacherRes = await fetch(
        "/api/teacher/onboarding/step1",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(formData),
        }
      );

      if (!teacherRes.ok) {
        const data =
          await teacherRes.json().catch(
            () => ({})
          );

        throw new Error(
          data.error ||
            "Failed to save Step 1 information."
        );
      }

      const teacherData =
        await teacherRes.json();

      const currentTeacherId =
        teacherData.teacherId;

      setTeacherId(currentTeacherId);

      localStorage.setItem(
        "teacherId",
        currentTeacherId
      );

      /*
       * ------------------------------------------------------
       * 2. Upload profile photo to S3.
       * ------------------------------------------------------
       */
      let profilePhotoData;

      if (profilePhoto) {
        const s3Key =
          await uploadFileToS3({
            file: profilePhoto,
            folder: "teacher-documents",
            teacherId: currentTeacherId,
          });

        profilePhotoData = {
          s3Key,
          originalFileName:
            profilePhoto.name,
          mimeType:
            profilePhoto.type,
          fileSize:
            profilePhoto.size,
        };
      }

      /*
       * ------------------------------------------------------
       * 3. Upload intro video to S3.
       * ------------------------------------------------------
       */
      let introVideoData;

      if (introVideo) {
        const s3Key =
          await uploadFileToS3({
            file: introVideo,
            folder: "teacher-documents",
            teacherId: currentTeacherId,
          });

        introVideoData = {
          s3Key,
          originalFileName:
            introVideo.name,
          mimeType:
            introVideo.type,
          fileSize:
            introVideo.size,
        };
      }

      /*
       * ------------------------------------------------------
       * 4. If files were uploaded, send their S3 metadata
       *    to Step 1 API so TeacherFile records are created.
       * ------------------------------------------------------
       */
      if (
        profilePhotoData ||
        introVideoData
      ) {
        const fileRes = await fetch(
          "/api/teacher/onboarding/step1",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ...formData,

              profilePhoto:
                profilePhotoData,

              introVideo:
                introVideoData,
            }),
          }
        );

        if (!fileRes.ok) {
          const data =
            await fileRes.json().catch(
              () => ({})
            );

          throw new Error(
            data.error ||
              "Files uploaded but could not be saved."
          );
        }
      }

      /*
       * ------------------------------------------------------
       * 5. Move to Step 2.
       * ------------------------------------------------------
       */
      router.push(
        "/teacher/onboarding/step2"
      );
    } catch (error) {
      console.error(
        "Step 1 submission error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    loading,
    submitting,

    formData,

    handleChange,
    handleSubmit,

    profilePhoto,
    introVideo,

    existingProfilePhoto,
    existingIntroVideo,

    handleProfilePhotoChange,
    handleIntroVideoChange,

    fileErrors,
  };
}