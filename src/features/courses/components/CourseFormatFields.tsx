import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  MODULE_OPTIONS,
  CUSTOM_OPTION,
} from "@/features/courses/constants/courseOptions";
import {
  MAX_SESSIONS_PER_WEEK,
  MIN_SESSIONS_PER_WEEK,
} from "@/features/courses/utils/courseInput";
import type { CourseFormData } from "@/features/courses/types/course";
import {
  GROUP_MAX_STUDENTS_LIMIT,
  GROUP_MIN_STUDENTS,
  isGroupType,
} from "@/features/courses/utils/groupClass";

const TIME_SLOT_OPTIONS = ["Morning", "Afternoon", "Evening"];

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

/** "Lecture format" section: duration, type, sessions per week, modules, preferred time slot. */
export default function CourseFormatFields({ formData, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Lecture duration" htmlFor="field-duration" hint="The price per lecture scales with this.">
        <SelectField id="field-duration" name="duration" value={formData.duration} onChange={onChange}
          placeholder="Select duration" options={DURATION_OPTIONS} className={controlClass} />
      </FormField>

      <FormField label="Class type" htmlFor="field-type">
        <SelectField id="field-type" name="type" value={formData.type} onChange={onChange}
          placeholder="Select type" options={TYPE_OPTIONS} className={controlClass} />
      </FormField>

      {isGroupType(formData.type) && (
        <FormField
          label="Maximum students in the group"
          htmlFor="field-groupMaxStudents"
          hint="Group class option (temporary) — more group settings will be added later."
        >
          <Input
            id="field-groupMaxStudents"
            name="groupMaxStudents"
            type="number"
            inputMode="numeric"
            min={GROUP_MIN_STUDENTS}
            max={GROUP_MAX_STUDENTS_LIMIT}
            step={1}
            placeholder={`e.g. ${GROUP_MIN_STUDENTS + 3}`}
            value={formData.groupMaxStudents}
            onChange={onChange}
            className={controlClass}
          />
        </FormField>
      )}

      <FormField
        label="Sessions per week"
        htmlFor="field-frequency"
        required
        hint={
          isGroupType(formData.type)
            ? "Group classes meet on exactly this many days a week."
            : `Whole number, ${MIN_SESSIONS_PER_WEEK} to ${MAX_SESSIONS_PER_WEEK}.`
        }
      >
        <Input
          id="field-frequency"
          name="frequency"
          type="number"
          inputMode="numeric"
          min={MIN_SESSIONS_PER_WEEK}
          max={MAX_SESSIONS_PER_WEEK}
          step={1}
          placeholder="e.g. 3"
          value={formData.frequency}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField label="Modules" htmlFor="field-modules">
        <div className="space-y-2">
          <SelectField id="field-modules" name="modules" value={formData.modules} onChange={onChange}
            placeholder="Select modules" options={MODULE_OPTIONS} className={controlClass} />

          {formData.modules === CUSTOM_OPTION && (
            <Input
              name="moduleCustom"
              type="number"
              min={1}
              max={50}
              placeholder="Number of modules"
              value={formData.moduleCustom}
              onChange={onChange}
              aria-label="Number of modules"
              className={controlClass}
            />
          )}
        </div>
      </FormField>

      <FormField
        label="Preferred time slot"
        htmlFor="field-timeSlot"
        hint="For our reference only — you still agree the exact days and time with each parent."
        className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]"
      >
        <SelectField id="field-timeSlot" name="timeSlot" value={formData.timeSlot} onChange={onChange}
          placeholder="Select time slot" options={TIME_SLOT_OPTIONS} className={controlClass} />
      </FormField>
    </div>
  );
}
