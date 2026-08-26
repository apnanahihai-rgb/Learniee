"use client";

import { Button } from "@/components/ui/button";
import { useTeacherStep2Form } from "@/features/teacher/hooks/useTeacherStep2Form";
import ProfessionalBackgroundSection from "@/features/teacher/components/onboarding/step2/ProfessionalBackgroundSection";
import CurrentWorkSection from "@/features/teacher/components/onboarding/step2/CurrentWorkSection";
import TeachingPreferencesSection from "@/features/teacher/components/onboarding/step2/TeachingPreferencesSection";
import EquipmentSkillsSection from "@/features/teacher/components/onboarding/step2/EquipmentSkillsSection";
import AdditionalInfoAndSocialSection from "@/features/teacher/components/onboarding/step2/AdditionalInfoAndSocialSection";
export default function TeacherStep2() {
  const {
  formData,
  loading,
  saving,
  error,
  handleChange,
  handleSubmit,
  goBack,

  certificationFiles,
  awardFiles,

  existingCertificationFiles,
  existingAwardFiles,

  setCertificationFiles,
  setAwardFiles,

  certificationError,
  awardError,
} = useTeacherStep2Form();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading professional information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Professional Information
      </h2>

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 text-red-700 p-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfessionalBackgroundSection
  formData={formData}
  onChange={handleChange}
  certificationFiles={certificationFiles}
  awardFiles={awardFiles}
  existingCertificationFiles={existingCertificationFiles}
  existingAwardFiles={existingAwardFiles}
  onCertificationChange={setCertificationFiles}
  onAwardChange={setAwardFiles}
  certificationError={certificationError}
  awardError={awardError}
/>

        <CurrentWorkSection formData={formData} onChange={handleChange} />

        <TeachingPreferencesSection formData={formData} onChange={handleChange} />

        <EquipmentSkillsSection formData={formData} onChange={handleChange} />

        <AdditionalInfoAndSocialSection formData={formData} onChange={handleChange} />

        {/* -------------------------------- */}
        {/* OTHER ACADEMY */}
        {/* -------------------------------- */}

        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="notWithOtherAcademy"
            checked={formData.notWithOtherAcademy}
            onChange={handleChange}
          />
          <span>I am not working with any other academy</span>
        </label>

        {/* -------------------------------- */}
        {/* BUTTONS */}
        {/* -------------------------------- */}

        <div className="flex justify-center gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="w-40 rounded-full border-purple-600 text-purple-600"
            disabled={saving}
          >
            Back
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full"
          >
            {saving ? "Saving..." : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
