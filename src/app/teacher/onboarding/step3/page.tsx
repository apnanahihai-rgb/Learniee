"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";

import DocumentUpload from "@/features/teacher/components/onboarding/step3/DocumentUpload";

interface DocumentSlot {
  key:
    | "dobProof"
    | "addressProof"
    | "qualificationProof";

  label: string;
}

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    key: "dobProof",
    label: "Date of Birth Proof",
  },
  {
    key: "addressProof",
    label: "Address Proof",
  },
  {
    key: "qualificationProof",
    label: "Qualification / Course Certification",
  },
];

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
];

const MAX_FILE_SIZE_MB = 50;

type DocumentKey =
  | "dobProof"
  | "addressProof"
  | "qualificationProof";

export default function TeacherStep3() {
  const router = useRouter();

  const [teacherId, setTeacherId] =
    useState<string | null>(null);

  const [panCardNumber, setPanCardNumber] =
    useState("");

  const [files, setFiles] =
    useState<Record<DocumentKey, File | null>>({
      dobProof: null,
      addressProof: null,
      qualificationProof: null,
    });

  const [fileErrors, setFileErrors] =
    useState<Record<string, string>>({});

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  /*
   * ------------------------------------------------------
   * Load Teacher ID
   * ------------------------------------------------------
   */

  useEffect(() => {
    const id =
      localStorage.getItem("teacherId");

    if (!id) {
      router.push(
        "/teacher/onboarding/step1"
      );

      return;
    }

    setTeacherId(id);
  }, [router]);

  /*
   * ------------------------------------------------------
   * File selection + validation
   * ------------------------------------------------------
   */

  function handleFileSelect(
    slotKey: DocumentKey,
    file: File | null,
  ) {
    setFileErrors((prev) => ({
      ...prev,
      [slotKey]: "",
    }));

    if (!file) {
      setFiles((prev) => ({
        ...prev,
        [slotKey]: null,
      }));

      return;
    }

    /*
     * Validate MIME type
     */
    if (
      !ACCEPTED_TYPES.includes(
        file.type,
      )
    ) {
      setFileErrors((prev) => ({
        ...prev,
        [slotKey]:
          "Only PNG, JPG, or PDF files are allowed.",
      }));

      return;
    }

    /*
     * Validate file size
     */
    if (
      file.size >
      MAX_FILE_SIZE_MB * 1024 * 1024
    ) {
      setFileErrors((prev) => ({
        ...prev,
        [slotKey]:
          `File must be under ${MAX_FILE_SIZE_MB}MB.`,
      }));

      return;
    }

    /*
     * Valid file
     */
    setFiles((prev) => ({
      ...prev,
      [slotKey]: file,
    }));
  }

  /*
   * ------------------------------------------------------
   * Submit
   * ------------------------------------------------------
   */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!teacherId) {
      setSubmitError(
        "Teacher ID is missing.",
      );

      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      /*
       * --------------------------------------------------
       * 1. Upload selected files to S3
       * --------------------------------------------------
       */

      const uploadEntries =
        await Promise.all(
          DOCUMENT_SLOTS.map(
            async ({ key }) => {
              const file = files[key];

              if (!file) {
                return [
                  key,
                  undefined,
                ] as const;
              }

              const s3Key =
                await uploadFileToS3({
                  file,
                  folder:
                    "teacher-documents",
                  teacherId,
                });

              return [
                key,
                {
                  s3Key,
                  originalFileName:
                    file.name,
                  mimeType:
                    file.type,
                  fileSize:
                    file.size,
                },
              ] as const;
            },
          ),
        );

      /*
       * Convert:
       *
       * [
       *   ["dobProof", {...}],
       *   ["addressProof", {...}]
       * ]
       *
       * into:
       *
       * {
       *   dobProof: {...},
       *   addressProof: {...}
       * }
       */

      const uploadedFiles =
        Object.fromEntries(
          uploadEntries,
        ) as Partial<
          Record<
            DocumentKey,
            {
              s3Key: string;
              originalFileName: string;
              mimeType: string;
              fileSize: number;
            }
          >
        >;

      /*
       * --------------------------------------------------
       * 2. Save metadata to database
       * --------------------------------------------------
       */

      const res = await fetch(
        "/api/teacher/onboarding/step3",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            teacherId,

            panCardNumber,

            dobProof:
              uploadedFiles.dobProof,

            addressProof:
              uploadedFiles.addressProof,

            qualificationProof:
              uploadedFiles.qualificationProof,
          }),
        },
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to save documents.",
        );
      }

      /*
       * --------------------------------------------------
       * 3. Onboarding completed
       * --------------------------------------------------
       */

      localStorage.removeItem(
        "teacherId",
      );

      router.push(
        "/teacher/pending-approval",
      );
    } catch (error) {
      console.error(
        "Step 3 submission error:",
        error,
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------------
   * UI
   * ------------------------------------------------------
   */

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Documents
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* -------------------------------- */}
        {/* DOCUMENT UPLOADS */}
        {/* -------------------------------- */}

        {DOCUMENT_SLOTS.map(
          ({ key, label }) => (
            <DocumentUpload
              key={key}
              id={`file-${key}`}
              label={label}
              file={files[key]}
              error={fileErrors[key]}
              acceptedTypes={
                ACCEPTED_TYPES
              }
              maxFileSizeMB={
                MAX_FILE_SIZE_MB
              }
              onChange={(file) =>
                handleFileSelect(
                  key,
                  file,
                )
              }
            />
          ),
        )}

        {/* -------------------------------- */}
        {/* PAN CARD */}
        {/* -------------------------------- */}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            PAN Card Number
          </label>

          <Input
            name="panCardNumber"
            placeholder="Enter PAN card number"
            value={panCardNumber}
            onChange={(e) =>
              setPanCardNumber(
                e.target.value.toUpperCase(),
              )
            }
          />
        </div>

        {/* -------------------------------- */}
        {/* ERROR */}
        {/* -------------------------------- */}

        {submitError && (
          <p className="text-sm text-red-600 text-center">
            {submitError}
          </p>
        )}

        {/* -------------------------------- */}
        {/* BUTTONS */}
        {/* -------------------------------- */}

        <div className="flex justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.back()
            }
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
            {submitting
              ? "Uploading..."
              : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}