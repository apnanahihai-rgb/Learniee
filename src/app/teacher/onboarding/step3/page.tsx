"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

interface DocumentSlot {
  key: "dobProof" | "addressProof" | "qualificationProof";
  label: string;
}

const DOCUMENT_SLOTS: DocumentSlot[] = [
  { key: "dobProof", label: "Date of Birth Proof" },
  { key: "addressProof", label: "Address Proof" },
  { key: "qualificationProof", label: "Qualification / Course Certification" },
];

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const MAX_FILE_SIZE_MB = 50;

export default function TeacherStep3() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [panCardNumber, setPanCardNumber] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({
    dobProof: null,
    addressProof: null,
    qualificationProof: null,
  });
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("teacherId");

    if (!id) {
      router.push("/teacher/onboarding/step1");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeacherId(id);
  }, [router]);

  function handleFileSelect(slotKey: string, file: File | null) {
    setFileErrors((prev) => ({ ...prev, [slotKey]: "" }));

    if (!file) {
      setFiles((prev) => ({ ...prev, [slotKey]: null }));
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileErrors((prev) => ({
        ...prev,
        [slotKey]: "Only PNG, JPG, or PDF files are allowed",
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileErrors((prev) => ({
        ...prev,
        [slotKey]: `File must be under ${MAX_FILE_SIZE_MB}MB`,
      }));
      return;
    }

    setFiles((prev) => ({ ...prev, [slotKey]: file }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!teacherId) {
      alert("Teacher ID is missing.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      // Upload any selected documents to S3 first, in parallel.
      const uploadEntries = await Promise.all(
        DOCUMENT_SLOTS.map(async ({ key }) => {
          const file = files[key];
          if (!file) return [key, undefined] as const;

          const s3Key = await uploadFileToS3({
            file,
            folder: "teacher-documents",
            teacherId,
          });

          return [key, s3Key] as const;
        })
      );

      const uploadedKeys = Object.fromEntries(uploadEntries);

      const res = await fetch("/api/teacher/onboarding/step3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          panCardNumber,
          dobProofKey: uploadedKeys.dobProof,
          addressProofKey: uploadedKeys.addressProof,
          qualificationProofKey: uploadedKeys.qualificationProof,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(data);
        setSubmitError(data.error || "Failed to save documents.");
        setSubmitting(false);
        return;
      }

      localStorage.removeItem("teacherId");

      router.push("/teacher/pending-approval");
    } catch (error) {
      console.error("Step 3 submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Documents
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {DOCUMENT_SLOTS.map(({ key, label }) => {
          const file = files[key];
          const error = fileErrors[key];

          return (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                {label}
              </label>

              <label
                htmlFor={`file-${key}`}
                className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input
                  id={`file-${key}`}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    handleFileSelect(key, e.target.files?.[0] ?? null)
                  }
                />

                {file ? (
                  <p className="text-sm font-medium text-purple-600 text-center break-all">
                    {file.name}
                  </p>
                ) : (
                  <p>Drag files or upload</p>
                )}

                <p className="text-xs mt-2">
                  Max file size: {MAX_FILE_SIZE_MB}MB | Supported: PNG, JPG, PDF
                </p>
              </label>

              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>
          );
        })}

        {/* PAN Card */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            PAN Card Number
          </label>

          <Input
            name="panCardNumber"
            placeholder="Enter PAN card number"
            value={panCardNumber}
            onChange={(e) =>
              setPanCardNumber(e.target.value.toUpperCase())
            }
          />
        </div>

        {submitError && (
          <p className="text-sm text-red-600 text-center">{submitError}</p>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
            className="w-40 rounded-full border-purple-600 text-purple-600"
          >
            Back
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full disabled:opacity-60"
          >
            {submitting ? "Uploading..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
