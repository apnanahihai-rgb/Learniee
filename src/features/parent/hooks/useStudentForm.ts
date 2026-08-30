"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import {
  initialStudentFormData,
  BOARD_OTHER,
  type StudentFormData,
} from "@/features/parent/types/student";

export const ACCEPTED_PHOTO_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_FILE_SIZE_MB = 50;
export const MIN_AGE = 1;
export const MAX_AGE = 25;

interface UseStudentFormOptions {
  onSubmit: (data: StudentFormData & { photoKey?: string }) => Promise<void>;
}

export function useStudentForm({ onSubmit }: UseStudentFormOptions) {
  const [form, setForm] = useState<StudentFormData>(initialStudentFormData);
  const [boardMode, setBoardMode] = useState<"preset" | "other">("preset");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Only image files get an actual visual preview - a PDF can't be
  // rendered in the circular avatar, so it's shown as a filename chip
  // instead. The object URL is derived (not stored in state) and
  // revoked via effect cleanup whenever `photo` changes or the
  // component unmounts, so we're not leaking blob URLs.
  const photoPreviewUrl = useMemo(() => {
    if (!photo || !photo.type.startsWith("image/")) return null;
    return URL.createObjectURL(photo);
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  function handlePhotoSelect(file: File | null) {
    setPhotoError("");

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Only PNG, JPG, or PDF files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setPhotoError(`File must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setPhoto(file);
  }

  function handleBoardPresetChange(value: string) {
    if (value === BOARD_OTHER) {
      setBoardMode("other");
      setForm((f) => ({ ...f, board: "" }));
    } else {
      setBoardMode("preset");
      setForm((f) => ({ ...f, board: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    if (form.age) {
      const ageNum = Number(form.age);
      if (!Number.isInteger(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE) {
        setError(`Age must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`);
        return;
      }
    }

    try {
      setUploading(true);

      let photoKey: string | undefined;

      if (photo) {
        photoKey = await uploadFileToS3({ file: photo, folder: "child-photos" });
      }

      await onSubmit({ ...form, photoKey });

      setForm(initialStudentFormData);
      setBoardMode("preset");
      setPhoto(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  function field<K extends keyof StudentFormData>(name: K) {
    return {
      value: form[name],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  return {
    form,
    field,
    boardMode,
    handleBoardPresetChange,

    photo,
    photoPreviewUrl,
    photoError,
    handlePhotoSelect,

    error,
    uploading,
    handleSubmit,
  };
}
