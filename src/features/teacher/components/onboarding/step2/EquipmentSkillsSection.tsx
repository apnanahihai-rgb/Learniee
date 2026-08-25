import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function EquipmentSkillsSection({ formData, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-6 text-sm text-gray-600">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="hasLaptop"
          checked={formData.hasLaptop}
          onChange={onChange}
        />
        <span>I have a Laptop</span>
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="hasPenTab"
          checked={formData.hasPenTab}
          onChange={onChange}
        />
        <span>I have a PenTab</span>
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="proficientInEnglish"
          checked={formData.proficientInEnglish}
          onChange={onChange}
        />
        <span>I am Proficient in English</span>
      </label>
    </div>
  );
}
