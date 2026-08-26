import { Input } from "@/components/ui/input";
import type {
  Step2ChangeHandler,
  Step2FormData,
} from "@/features/teacher/types/step2";

import CertificationUpload from "@/features/teacher/components/onboarding/step2/CertificationUpload";
import AwardUpload from "@/features/teacher/components/onboarding/step2/AwardUpload";

export interface ExistingTeacherFile {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;

  certificationFiles: File[];
  awardFiles: File[];

  existingCertificationFiles: ExistingTeacherFile[];
  existingAwardFiles: ExistingTeacherFile[];

  onCertificationChange: (files: File[]) => void;
  onAwardChange: (files: File[]) => void;

  certificationError?: string;
  awardError?: string;
}

export default function ProfessionalBackgroundSection({
  formData,
  onChange,

  certificationFiles,
  awardFiles,

  existingCertificationFiles,
  existingAwardFiles,

  onCertificationChange,
  onAwardChange,

  certificationError,
  awardError,
}: Props) {
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

      <h3 className="font-semibold text-gray-800 mt-6">
        Experience
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          name="overallExperience"
          value={formData.overallExperience}
          onChange={onChange}
          className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
        >
          <option value="">
            Overall Teaching Experience
          </option>

          <option value="0">
            Less than 1 year
          </option>

          <option value="1-3">
            1-3 years
          </option>

          <option value="3-5">
            3-5 years
          </option>

          <option value="5-10">
            5-10 years
          </option>

          <option value="10+">
            10+ years
          </option>
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
      {/* CERTIFICATIONS + AWARDS */}
      {/* -------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <CertificationUpload
          files={certificationFiles}
          existingFiles={existingCertificationFiles}
          onChange={onCertificationChange}
          error={certificationError}
        />

        <AwardUpload
          files={awardFiles}
          existingFiles={existingAwardFiles}
          onChange={onAwardChange}
          error={awardError}
        />
      </div>
    </>
  );
}