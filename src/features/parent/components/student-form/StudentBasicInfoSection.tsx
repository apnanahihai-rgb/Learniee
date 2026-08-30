"use client";

import { Labeled, inputClass } from "@/features/parent/components/student-form/Labeled";
import { GENDER_OPTIONS, type StudentFormData } from "@/features/parent/types/student";
import { MIN_AGE, MAX_AGE } from "@/features/parent/hooks/useStudentForm";

type FieldProps<K extends keyof StudentFormData> = {
  value: StudentFormData[K];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

interface StudentBasicInfoSectionProps {
  field: <K extends keyof StudentFormData>(name: K) => FieldProps<K>;
}

export default function StudentBasicInfoSection({ field }: StudentBasicInfoSectionProps) {
  return (
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
              <option key={g} value={g}>
                {g}
              </option>
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
  );
}
