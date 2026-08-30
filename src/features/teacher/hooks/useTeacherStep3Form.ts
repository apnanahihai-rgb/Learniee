"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateFile } from "@/features/shared/utils/validateFile";
import { uploadTeacherFile } from "@/features/teacher/utils/uploadTeacherFile";
import {
  DOCUMENT_SLOTS,
  STEP3_ACCEPTED_TYPES,
  STEP3_MAX_FILE_SIZE_MB,
  type DocumentKey,
} from "@/features/teacher/types/step3";

const emptyFiles: Record<DocumentKey, File | null> = {
  dobProof: null,
  addressProof: null,
  qualificationProof: null,
};

export function useTeacherStep3Form() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [panCardNumber, setPanCardNumber] = useState("");
  const [files, setFiles] = useState<Record<DocumentKey, File | null>>(emptyFiles);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("teacherId");

    if (!id) {
      router.push("/teacher/onboarding/step1");
      return;
    }

    setTeacherId(id);
  }, [router]);

  function handleFileSelect(slotKey: DocumentKey, file: File | null) {
    const error = validateFile(file, {
      allowedTypes: STEP3_ACCEPTED_TYPES,
      allowedTypesLabel: "PNG, JPG, or PDF files",
      maxSizeBytes: STEP3_MAX_FILE_SIZE_MB * 1024 * 1024,
      maxSizeLabel: `${STEP3_MAX_FILE_SIZE_MB}MB`,
    });

    setFileErrors((prev) => ({ ...prev, [slotKey]: error }));
    setFiles((prev) => ({ ...prev, [slotKey]: error ? null : file }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!teacherId) {
      setSubmitError("Teacher ID is missing.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      // 1. Upload every selected document to S3.
      const uploadEntries = await Promise.all(
        DOCUMENT_SLOTS.map(async ({ key }) => {
          const file = files[key];
          if (!file) return [key, undefined] as const;

          return [key, await uploadTeacherFile(file, teacherId)] as const;
        }),
      );

      const uploadedFiles = Object.fromEntries(uploadEntries) as Partial<
        Record<DocumentKey, Awaited<ReturnType<typeof uploadTeacherFile>>>
      >;

      // 2. Save PAN + document metadata, completing onboarding.
      const res = await fetch("/api/teacher/onboarding/step3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          panCardNumber,
          dobProof: uploadedFiles.dobProof,
          addressProof: uploadedFiles.addressProof,
          qualificationProof: uploadedFiles.qualificationProof,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save documents.");
      }

      localStorage.removeItem("teacherId");
      router.push("/teacher/pending-approval");
    } catch (error) {
      console.error("Step 3 submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    panCardNumber,
    setPanCardNumber,
    files,
    fileErrors,
    handleFileSelect,
    submitting,
    submitError,
    handleSubmit,
    goBack: () => router.back(),
  };
}
