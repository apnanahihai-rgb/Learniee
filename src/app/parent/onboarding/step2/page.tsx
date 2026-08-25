"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

const fields = [
  "firstName", "lastName", "visibleName", "gender", "age",
  "standard", "board", "currentSchoolName", "learningDifficulties",
];

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const MAX_FILE_SIZE_MB = 50;

export default function Step2() {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f, ""]))
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let photoKey: string | undefined;

      if (photo) {
        photoKey = await uploadFileToS3({
          file: photo,
          folder: "child-photos",
        });
      }

      const res = await fetch("/api/onboarding/child-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoKey }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/parent/onboarding/step3");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleNext} className="max-w-md mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold text-center">Child Information</h1>
      {fields.map((key) => (
        <input
          key={key}
          required
          placeholder={key}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="border p-2 w-full"
        />
      ))}

      <div>
        <label
          htmlFor="child-photo"
          className="border-2 border-dashed rounded p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <input
            id="child-photo"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) =>
              handlePhotoSelect(e.target.files?.[0] ?? null)
            }
          />
          {photo ? (
            <p className="text-sm font-medium text-violet-600 break-all">
              {photo.name}
            </p>
          ) : (
            <p className="text-sm">Upload child&apos;s photo</p>
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
        disabled={submitting}
        className="bg-violet-600 text-white p-2 w-full rounded disabled:opacity-60"
      >
        {submitting ? "Uploading..." : "Next"}
      </button>
    </form>
  );
}
