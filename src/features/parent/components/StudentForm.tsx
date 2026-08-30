"use client";

import { useStudentForm } from "@/features/parent/hooks/useStudentForm";
import StudentPhotoField from "@/features/parent/components/student-form/StudentPhotoField";
import StudentBasicInfoSection from "@/features/parent/components/student-form/StudentBasicInfoSection";
import StudentAcademicInfoSection from "@/features/parent/components/student-form/StudentAcademicInfoSection";
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
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-8">
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
