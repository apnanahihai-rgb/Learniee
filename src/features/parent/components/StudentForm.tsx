"use client";

import { useState } from "react";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import {
  initialStudentFormData,
  STUDENT_FORM_FIELDS,
  type StudentFormData,
} from "@/features/parent/types/student";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const MAX_FILE_SIZE_MB = 50;

interface Props {
  saving: boolean;
  onSubmit: (data: StudentFormData & { photoKey?: string }) => Promise<void>;
}

/**
 * Same fields as onboarding's Child Information step
 * (src/app/parent/onboarding/step2/page.tsx) - used for adding any
 * student profile after the first one from onboarding.
 */
export default function StudentForm({ saving, onSubmit }: Props) {
  const [form, setForm] = useState<StudentFormData>(initialStudentFormData);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function handlePhotoSelect(file: File | null) {
    setPhotoError("");

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only PNG, JPG, or PDF files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setPhotoError(`File must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    try {
      setUploading(true);

      let photoKey: string | undefined;

      if (photo) {
        photoKey = await uploadFileToS3({
          file: photo,
          folder: "child-photos",
        });
      }

      await onSubmit({ ...form, photoKey });

      setForm(initialStudentFormData);
      setPhoto(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  const busy = saving || uploading;

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
      {STUDENT_FORM_FIELDS.map(({ name, label, required }) => (
        <input
          key={name}
          required={required}
          placeholder={label}
          value={form[name]}
          onChange={(e) =>
            setForm((f) => ({ ...f, [name]: e.target.value }))
          }
          className="border p-2 w-full rounded"
        />
      ))}

      <div>
        <label
          htmlFor="student-photo"
          className="border-2 border-dashed rounded p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <input
            id="student-photo"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) => handlePhotoSelect(e.target.files?.[0] ?? null)}
          />
          {photo ? (
            <p className="text-sm font-medium text-violet-600 break-all">
              {photo.name}
            </p>
          ) : (
            <p className="text-sm">Upload student&apos;s photo</p>
          )}
          <p className="text-xs mt-1">
            Max file size: {MAX_FILE_SIZE_MB}MB | Supported: PNG, JPG, PDF
          </p>
        </label>
        {photoError && (
          <p className="text-red-600 text-xs mt-1">{photoError}</p>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="bg-violet-600 text-white p-2 w-full rounded disabled:opacity-60"
      >
        {busy ? "Saving..." : "Add student profile"}
      </button>
    </form>
  );
}
