"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { emptyStep2FormData, type Step2FormData } from "@/features/parent/types/onboarding";
import {
  ACCEPTED_TYPES,
  MAX_FILE_SIZE_MB,
} from "@/features/parent/components/onboarding/step2/ChildPhotoUpload";

export function useParentStep2Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step2FormData>(emptyStep2FormData);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhotoSelect(file: File | null) {
    setPhotoError("");

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only PNG, JPG, or PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setPhotoError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let photoKey: string | undefined;

      if (photo) {
        photoKey = await uploadFileToS3({ file: photo, folder: "child-photos" });
      }

      const res = await fetch("/api/onboarding/child-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, photoKey }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      router.push("/parent/onboarding/step3");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return {
    formData,
    photo,
    photoError,
    submitting,
    error,
    handleChange,
    handlePhotoSelect,
    handleSubmit,
  };
}
