"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadTeacherFiles } from "@/features/teacher/utils/uploadTeacherFile";
import {
  initialStep2FormData,
  mapProfessionalInfoToFormData,
  type Step2ChangeHandler,
  type Step2FormData,
} from "@/features/teacher/types/step2";
import type { UploadedFileMeta } from "@/features/shared/components/MultiFileUploadField";

async function postStep2(body: unknown) {
  const res = await fetch("/api/teacher/onboarding/step2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to save Step 2.");
  }

  return data;
}

/**
 * Encapsulates loading, editing, and submitting the Step 2
 * (professional information) onboarding form.
 */
export function useTeacherStep2Form() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Step2FormData>(initialStep2FormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [certificationFiles, setCertificationFiles] = useState<File[]>([]);
  const [awardFiles, setAwardFiles] = useState<File[]>([]);
  const [existingCertificationFiles, setExistingCertificationFiles] =
    useState<UploadedFileMeta[]>([]);
  const [existingAwardFiles, setExistingAwardFiles] = useState<UploadedFileMeta[]>([]);

  // Validation errors surfaced on the certification/award upload fields
  // themselves (MultiFileUploadField already validates type/size per
  // file client-side — these are reserved for any future server-echoed
  // errors, e.g. a rejected upload after the fact).
  const [certificationError, setCertificationError] = useState("");
  const [awardError, setAwardError] = useState("");

  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);
        setError("");

        const storedTeacherId = localStorage.getItem("teacherId");

        if (!storedTeacherId) {
          router.push("/teacher/onboarding/step1");
          return;
        }

        setTeacherId(storedTeacherId);

        const res = await fetch("/api/teacher/onboarding/step2", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load professional information.");
        }

        const data = await res.json();

        if (data.files) {
          setExistingCertificationFiles(data.files.certifications ?? []);
          setExistingAwardFiles(data.files.awards ?? []);
        }

        if (data.professionalInfo) {
          setFormData(mapProfessionalInfoToFormData(data.professionalInfo));
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your professional information.");
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, [router]);

  const handleChange: Step2ChangeHandler = (e) => {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    setFormData((prev) => ({ ...prev, [target.name]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!teacherId) {
      setError("Teacher ID is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // 1. Save Step 2 professional information.
      const data = await postStep2({ teacherId, ...formData });
      const currentTeacherId = data.teacherId;
      localStorage.setItem("teacherId", currentTeacherId);

      // 2. Upload certifications/awards to S3.
      const certificationMetadata = await uploadTeacherFiles(
        certificationFiles,
        currentTeacherId,
      );
      const awardMetadata = await uploadTeacherFiles(awardFiles, currentTeacherId);

      // 3. Save the uploaded files' metadata, if any were uploaded.
      if (certificationMetadata.length > 0 || awardMetadata.length > 0) {
        await postStep2({
          teacherId: currentTeacherId,
          ...formData,
          certifications: certificationMetadata,
          awards: awardMetadata,
        });
      }

      router.push("/teacher/onboarding/step3");
    } catch (err) {
      console.error("Step 2 submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save Step 2.");
    } finally {
      setSaving(false);
    }
  }

  return {
    formData,
    loading,
    saving,
    error,

    handleChange,
    handleSubmit,

    goBack: () => router.back(),

    certificationFiles,
    awardFiles,

    existingCertificationFiles,
    existingAwardFiles,

    setCertificationFiles,
    setAwardFiles,

    certificationError,
    awardError,
  };
}
