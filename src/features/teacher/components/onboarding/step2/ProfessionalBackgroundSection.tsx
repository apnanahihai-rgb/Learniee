import { Input } from "@/components/ui/input";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

/**
 * Basic professional info + teaching experience + certification/award
 * upload placeholders (Steps 2 sections 1-3).
 */
export default function ProfessionalBackgroundSection({ formData, onChange }: Props) {
  return (
    <>
      {/* -------------------------------- */}
      {/* BASIC PROFESSIONAL INFORMATION */}
      {/* -------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          name="referredBy"
          value={formData.referredBy}
          onChange={onChange}
          className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
        >
          <option value="">Referred by</option>
          <option value="website">Website</option>
          <option value="friend">Friend</option>
          <option value="social_media">Social Media</option>
          <option value="other">Other</option>
        </select>

        <Input
          name="qualifications"
          placeholder="Qualifications"
          value={formData.qualifications}
          onChange={onChange}
        />
      </div>

      {/* -------------------------------- */}
      {/* EXPERIENCE */}
      {/* -------------------------------- */}

      <h3 className="font-semibold text-gray-800 mt-6">Experience</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          name="overallExperience"
          value={formData.overallExperience}
          onChange={onChange}
          className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
        >
          <option value="">Overall Teaching Experience</option>
          <option value="0">Less than 1 year</option>
          <option value="1-3">1-3 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10+">10+ years</option>
        </select>

        <Input
          name="comfortableLanguage"
          placeholder="Comfortable Language"
          value={formData.comfortableLanguage}
          onChange={onChange}
        />
      </div>

      <Input
        name="schoolsTaught"
        placeholder="Schools you taught before"
        value={formData.schoolsTaught}
        onChange={onChange}
      />

      {/* -------------------------------- */}
      {/* FILE PLACEHOLDERS */}
      {/* -------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">
          Upload Certifications
          <br />
          <span className="text-xs">S3 Logic later</span>
        </div>

        <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">
          Upload Awards
          <br />
          <span className="text-xs">S3 Logic later</span>
        </div>
      </div>
    </>
  );
}
