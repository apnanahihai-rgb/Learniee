"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import {
  initialStep2FormData,
  type Step2ChangeHandler,
  type Step2FormData,
} from "@/features/teacher/types/step2";
interface ExistingTeacherFile {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
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

  const [existingCertificationFiles, setExistingCertificationFiles] = useState<
    ExistingTeacherFile[]
  >([]);

  const [existingAwardFiles, setExistingAwardFiles] = useState<
    ExistingTeacherFile[]
  >([]);

  const [certificationError, setCertificationError] = useState("");

  const [awardError, setAwardError] = useState("");
  // Load existing Step 2 data
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
        const professionalInfo = data.professionalInfo;
        if (data.files) {
          setExistingCertificationFiles(data.files.certifications ?? []);

          setExistingAwardFiles(data.files.awards ?? []);
        }
        if (professionalInfo) {
          setFormData({
            referredBy: professionalInfo.referredBy ?? "",
            qualifications: professionalInfo.qualifications ?? "",
            overallExperience: professionalInfo.overallExperience ?? "",
            comfortableLanguage: professionalInfo.comfortableLanguage ?? "",
            schoolsTaught: professionalInfo.schoolsTaught ?? "",

            workingInSchool: professionalInfo.workingInSchool ?? false,
            schoolName: professionalInfo.schoolName ?? "",

            workingInAcademy: professionalInfo.workingInAcademy ?? false,
            academyName: professionalInfo.academyName ?? "",

            homeTuitionArea: professionalInfo.homeTuitionArea ?? "",
            studentsTaught: professionalInfo.studentsTaught ?? "",
            canTakeHomeTuition: professionalInfo.canTakeHomeTuition ?? "",
            hoursPerDay: professionalInfo.hoursPerDay ?? "",

            haveOwnNotes: professionalInfo.haveOwnNotes ?? "",
            canMakePresentations: professionalInfo.canMakePresentations ?? "",
            provideHomework: professionalInfo.provideHomework ?? "",
            conductPTM: professionalInfo.conductPTM ?? "",

            hasLaptop: professionalInfo.hasLaptop ?? false,
            hasPenTab: professionalInfo.hasPenTab ?? false,
            proficientInEnglish: professionalInfo.proficientInEnglish ?? false,

            additionalInfo: professionalInfo.additionalInfo ?? "",

            facebook: professionalInfo.facebook ?? "",
            linkedin: professionalInfo.linkedin ?? "",
            instagram: professionalInfo.instagram ?? "",
            youtube: professionalInfo.youtube ?? "",

            notWithOtherAcademy: professionalInfo.notWithOtherAcademy ?? false,
          });
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

    setFormData((prev) => ({
      ...prev,
      [target.name]: value,
    }));
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

    /*
     * ------------------------------------------------------
     * 1. Save Step 2 professional information
     * ------------------------------------------------------
     */

    const res = await fetch(
      "/api/teacher/onboarding/step2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          ...formData,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Failed to save Step 2."
      );
    }

    const currentTeacherId =
      data.teacherId;

    localStorage.setItem(
      "teacherId",
      currentTeacherId
    );

    /*
     * ------------------------------------------------------
     * 2. Upload certifications
     * ------------------------------------------------------
     */

    const certificationMetadata = [];

    for (const file of certificationFiles) {
      const s3Key = await uploadFileToS3({
        file,
        folder: "teacher-documents",
        teacherId: currentTeacherId,
      });

      certificationMetadata.push({
        s3Key,
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    }

    /*
     * ------------------------------------------------------
     * 3. Upload awards
     * ------------------------------------------------------
     */

    const awardMetadata = [];

    for (const file of awardFiles) {
      const s3Key = await uploadFileToS3({
        file,
        folder: "teacher-documents",
        teacherId: currentTeacherId,
      });

      awardMetadata.push({
        s3Key,
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    }

    /*
     * ------------------------------------------------------
     * 4. Save uploaded file metadata
     * ------------------------------------------------------
     */

    if (
      certificationMetadata.length > 0 ||
      awardMetadata.length > 0
    ) {
      const fileRes = await fetch(
        "/api/teacher/onboarding/step2",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            teacherId: currentTeacherId,

            ...formData,

            certifications:
              certificationMetadata,

            awards:
              awardMetadata,
          }),
        }
      );

      const fileData =
        await fileRes.json();

      if (!fileRes.ok) {
        throw new Error(
          fileData.error ||
            "Files uploaded but could not be saved."
        );
      }
    }

    /*
     * ------------------------------------------------------
     * 5. Move to Step 3
     * ------------------------------------------------------
     */

    router.push(
      "/teacher/onboarding/step3"
    );
  } catch (err) {
    console.error(
      "Step 2 submission error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Failed to save Step 2."
    );
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
