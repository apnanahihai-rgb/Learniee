"use client";

import { Info } from "lucide-react";

import { useStudentForm } from "@/features/parent/hooks/useStudentForm";
import StudentPhotoField from "@/features/parent/components/student-form/StudentPhotoField";
import StudentBasicInfoSection from "@/features/parent/components/student-form/StudentBasicInfoSection";
import StudentAcademicInfoSection from "@/features/parent/components/student-form/StudentAcademicInfoSection";
import SectionCard from "@/features/parent/components/student-form/SectionCard";
import { Labeled, inputClass } from "@/features/parent/components/student-form/Labeled";
import type { StudentFormData } from "@/features/parent/types/student";

interface Props {
  saving: boolean;
  onSubmit: (data: StudentFormData & { photoKey?: string }) => Promise<void>;
}

/**
 * Same fields as onboarding's Child Information step
 * (src/app/parent/onboarding/step2/page.tsx) - used for adding any
 * student profile after the first one from onboarding.
 *
 * Redesigned (Aug 31, 2026) to cut visual clutter: each group of
 * fields now sits in its own softly-tinted card (SectionCard)
 * instead of just a small gray label floating above a flat list of
 * inputs, so the form reads as a handful of clear steps rather than
 * one long wall of fields.
 */
export default function StudentForm({ saving, onSubmit }: Props) {
  const {
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
  } = useStudentForm({ onSubmit });

  const busy = saving || uploading;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <StudentPhotoField
        firstName={form.firstName}
        photo={photo}
        photoPreviewUrl={photoPreviewUrl}
        photoError={photoError}
        onPhotoSelect={handlePhotoSelect}
      />

      <StudentBasicInfoSection field={field} />

      <StudentAcademicInfoSection
        field={field}
        boardMode={boardMode}
        boardValue={form.board}
        onBoardPresetChange={handleBoardPresetChange}
      />

      <SectionCard icon={Info} title="Additional info">
        <Labeled label="Learning difficulties (if any)">
          <textarea
            rows={2}
            placeholder="e.g. Dyslexia, ADHD - anything a teacher should know"
            {...field("learningDifficulties")}
            className={`${inputClass} resize-none`}
          />
        </Labeled>
      </SectionCard>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-3 rounded-full shadow-playful transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "Saving..." : "Add student profile"}
      </button>
    </form>
  );
}
