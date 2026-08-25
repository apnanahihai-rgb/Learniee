import { Input } from "@/components/ui/input";
import type { Step2ChangeHandler, Step2FormData } from "@/features/teacher/types/step2";

interface Props {
  formData: Step2FormData;
  onChange: Step2ChangeHandler;
}

export default function CurrentWorkSection({ formData, onChange }: Props) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-4">
      <label className="flex items-center space-x-2 text-sm text-gray-600">
        <input
          type="checkbox"
          name="workingInSchool"
          checked={formData.workingInSchool}
          onChange={onChange}
        />
        <span>Working in a School</span>
      </label>

      <Input
        name="schoolName"
        placeholder="School Name"
        value={formData.schoolName}
        disabled={!formData.workingInSchool}
        onChange={onChange}
      />

      <label className="flex items-center space-x-2 text-sm text-gray-600">
        <input
          type="checkbox"
          name="workingInAcademy"
          checked={formData.workingInAcademy}
          onChange={onChange}
        />
        <span>Working in an Academy</span>
      </label>

      <Input
        name="academyName"
        placeholder="Academy Name"
        value={formData.academyName}
        disabled={!formData.workingInAcademy}
        onChange={onChange}
      />
    </div>
  );
}
