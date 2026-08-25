import { Input } from "@/components/ui/input";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function AdditionalInfoAndSocialSection({ formData, onChange }: Props) {
  return (
    <>
      {/* -------------------------------- */}
      {/* ADDITIONAL INFORMATION */}
      {/* -------------------------------- */}

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Anything else that you would like to share with us? [OPTIONAL]
        </label>

        <textarea
          name="additionalInfo"
          placeholder="Type..."
          value={formData.additionalInfo}
          onChange={onChange}
          rows={4}
          className="w-full border rounded-md p-3 text-sm text-gray-600"
        />
      </div>

      {/* -------------------------------- */}
      {/* SOCIAL MEDIA */}
      {/* -------------------------------- */}

      <h3 className="font-semibold text-gray-800 mt-6">Social Media</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="facebook" placeholder="Facebook" value={formData.facebook} onChange={onChange} />
        <Input name="linkedin" placeholder="LinkedIn" value={formData.linkedin} onChange={onChange} />
        <Input
          name="instagram"
          placeholder="Instagram"
          value={formData.instagram}
          onChange={onChange}
        />
        <Input name="youtube" placeholder="Youtube" value={formData.youtube} onChange={onChange} />
      </div>
    </>
  );
}
