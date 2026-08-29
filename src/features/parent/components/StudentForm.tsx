"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, FileText, X } from "lucide-react";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import ChildAvatar from "@/features/parent/components/ChildAvatar";
import {
  initialStudentFormData,
  GENDER_OPTIONS,
  BOARD_OPTIONS,
  BOARD_OTHER,
  type StudentFormData,
} from "@/features/parent/types/student";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const MAX_FILE_SIZE_MB = 50;
const MIN_AGE = 1;
const MAX_AGE = 25;

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
  const [boardMode, setBoardMode] = useState<"preset" | "other">("preset");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Only image files get an actual visual preview - a PDF can't be
  // rendered in the circular avatar, so it's shown as a filename
  // chip instead. The object URL is derived (not stored in state)
  // and revoked via effect cleanup whenever `photo` changes or the
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
        photoKey = await uploadFileToS3({
          file: photo,
          folder: "child-photos",
        });
      }

      await onSubmit({ ...form, photoKey });

      setForm(initialStudentFormData);
      setBoardMode("preset");
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

  function field<K extends keyof StudentFormData>(name: K) {
    return {
      value: form[name],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-8">
      {/* PHOTO */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <ChildAvatar
            src={photoPreviewUrl}
            name={form.firstName || "?"}
            size="lg"
          />

          <label
            htmlFor="student-photo"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center cursor-pointer hover:bg-violet-700 transition-colors shadow-sm ring-2 ring-white"
            title="Upload a photo"
          >
            <Camera size={15} />
            <input
              id="student-photo"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {photo && !photo.type.startsWith("image/") && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            <FileText size={13} />
            <span className="max-w-[12rem] truncate">{photo.name}</span>
            <button
              type="button"
              onClick={() => handlePhotoSelect(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          Max file size: {MAX_FILE_SIZE_MB}MB · PNG, JPG, or PDF
        </p>
        {photoError && (
          <p className="text-red-600 text-xs mt-1">{photoError}</p>
        )}
      </div>

      {/* BASIC INFO */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Basic info
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Labeled label="First name" required>
            <input required placeholder="e.g. Aron" {...field("firstName")} className={inputClass} />
          </Labeled>
          <Labeled label="Last name" required>
            <input required placeholder="e.g. Shah" {...field("lastName")} className={inputClass} />
          </Labeled>
        </div>

        <Labeled label="Display name" hint="How this appears to teachers (optional)" className="mt-3">
          <input placeholder="e.g. Ronnie" {...field("visibleName")} className={inputClass} />
        </Labeled>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Labeled label="Gender">
            <select {...field("gender")} className={inputClass}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Labeled>

          <Labeled label="Age">
            <input
              type="number"
              min={MIN_AGE}
              max={MAX_AGE}
              placeholder="e.g. 12"
              {...field("age")}
              className={inputClass}
            />
          </Labeled>
        </div>
      </div>

      {/* ACADEMIC INFO */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Academic info
        </h2>

        <Labeled label="Standard / Grade">
          <input placeholder="e.g. 8th Grade" {...field("standard")} className={inputClass} />
        </Labeled>

        <Labeled label="Board" className="mt-3">
          <select
            value={boardMode === "other" ? BOARD_OTHER : form.board}
            onChange={(e) => handleBoardPresetChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select board</option>
            {BOARD_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
            <option value={BOARD_OTHER}>Other</option>
          </select>
          {boardMode === "other" && (
            <input
              placeholder="Enter board name"
              {...field("board")}
              className={`${inputClass} mt-2`}
            />
          )}
        </Labeled>

        <Labeled label="Current school name" className="mt-3">
          <input placeholder="e.g. St. Xavier's High School" {...field("currentSchoolName")} className={inputClass} />
        </Labeled>
      </div>

      {/* ADDITIONAL INFO */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Additional info
        </h2>

        <Labeled label="Learning difficulties (if any)">
          <textarea
            rows={2}
            placeholder="e.g. Dyslexia, ADHD - anything a teacher should know"
            {...field("learningDifficulties")}
            className={`${inputClass} resize-none`}
          />
        </Labeled>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="bg-violet-600 text-white font-medium p-2.5 w-full rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60"
      >
        {busy ? "Saving..." : "Add student profile"}
      </button>
    </form>
  );
}

const inputClass =
  "border border-gray-200 p-2.5 w-full rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-colors";

function Labeled({
  label,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}
