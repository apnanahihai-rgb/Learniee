"use client";

import { Labeled, inputClass } from "@/features/parent/components/student-form/Labeled";
import SectionCard from "@/features/parent/components/student-form/SectionCard";
import { GraduationCap } from "lucide-react";
import {
  BOARD_OPTIONS,
  BOARD_OTHER,
  type StudentFormData,
} from "@/features/parent/types/student";

type FieldProps<K extends keyof StudentFormData> = {
  value: StudentFormData[K];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

interface StudentAcademicInfoSectionProps {
  field: <K extends keyof StudentFormData>(name: K) => FieldProps<K>;
  boardMode: "preset" | "other";
  boardValue: string;
  onBoardPresetChange: (value: string) => void;
}

export default function StudentAcademicInfoSection({
  field,
  boardMode,
  boardValue,
  onBoardPresetChange,
}: StudentAcademicInfoSectionProps) {
  return (
    <SectionCard icon={GraduationCap} title="Academic info">
      <Labeled label="Standard / Grade">
        <input placeholder="e.g. 8th Grade" {...field("standard")} className={inputClass} />
      </Labeled>

      <Labeled label="Board" className="mt-3">
        <select
          value={boardMode === "other" ? BOARD_OTHER : boardValue}
          onChange={(e) => onBoardPresetChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select board</option>
          {BOARD_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={BOARD_OTHER}>Other</option>
        </select>
        {boardMode === "other" && (
          <input
            placeholder="Enter board name"
            {...field("board")}
            className={`${inputClass} mt-2`}
          />
        )}
      </Labeled>

      <Labeled label="Current school name" className="mt-3">
        <input
          placeholder="e.g. St. Xavier's High School"
          {...field("currentSchoolName")}
          className={inputClass}
        />
      </Labeled>
    </SectionCard>
  );
}
