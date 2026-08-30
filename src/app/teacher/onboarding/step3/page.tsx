"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/features/teacher/components/onboarding/step3/DocumentUpload";
import { useTeacherStep3Form } from "@/features/teacher/hooks/useTeacherStep3Form";
import {
  DOCUMENT_SLOTS,
  STEP3_ACCEPTED_TYPES,
  STEP3_MAX_FILE_SIZE_MB,
} from "@/features/teacher/types/step3";

export default function TeacherStep3() {
  const {
    panCardNumber,
    setPanCardNumber,
    files,
    fileErrors,
    handleFileSelect,
    submitting,
    submitError,
    handleSubmit,
    goBack,
  } = useTeacherStep3Form();

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">Documents</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {DOCUMENT_SLOTS.map(({ key, label }) => (
          <DocumentUpload
            key={key}
            id={`file-${key}`}
            label={label}
            file={files[key]}
            error={fileErrors[key]}
            acceptedTypes={STEP3_ACCEPTED_TYPES}
            maxFileSizeMB={STEP3_MAX_FILE_SIZE_MB}
            onChange={(file) => handleFileSelect(key, file)}
          />
        ))}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            PAN Card Number
          </label>
          <Input
            name="panCardNumber"
            placeholder="Enter PAN card number"
            value={panCardNumber}
            onChange={(e) => setPanCardNumber(e.target.value.toUpperCase())}
          />
        </div>

        {submitError && (
          <p className="text-sm text-red-600 text-center">{submitError}</p>
        )}

        <div className="flex justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
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
