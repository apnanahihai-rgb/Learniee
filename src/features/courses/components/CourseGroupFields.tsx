import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  GROUP_MODES,
  GROUP_MODE_LABELS,
  type GroupMode,
} from "@/features/courses/utils/groupClass";
import type { CourseFormData } from "@/features/courses/types/course";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  onToggleDay: (day: number) => void;
  onModeChange: (mode: GroupMode) => void;
}

const MODE_HINTS: Record<GroupMode, string> = {
  TIME_BOUND: "Fixed start and end dates.",
  OPEN: "Anyone can join any time.",
};

/** Group-only fields: weekly days + time, time-bound / open, start and end dates. */
export default function CourseGroupFields({ formData, onChange, onToggleDay, onModeChange }: Props) {
  const today = toDateKey(todayInPlatformTz());
  const timeBound = formData.groupMode === "TIME_BOUND";

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-violet-100 pt-4 md:grid-cols-2">
      <FormField
        label="Weekly days"
        htmlFor="field-groupDays"
        required
        className="md:col-span-2"
        hint="The group meets on these days every week."
      >
        <div id="field-groupDays" className="flex flex-wrap gap-2" role="group" aria-label="Weekly days">
          {WEEKDAY_LABELS.map((label, day) => {
            const active = formData.groupDays.includes(day);

            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleDay(day)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Class time (IST)" htmlFor="field-groupTime" required>
        <Input
          id="field-groupTime"
          name="groupTime"
          type="time"
          value={formData.groupTime}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField label="Group type" htmlFor="field-groupMode" required>
        <div id="field-groupMode" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Group type">
          {GROUP_MODES.map((mode) => {
            const active = formData.groupMode === mode;

            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onModeChange(mode)}
                className={`rounded-xl border px-4 py-2 text-left text-sm transition-colors ${
                  active
                    ? "border-violet-600 bg-violet-50 text-violet-800"
                    : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                }`}
              >
                <span className="block font-semibold">{GROUP_MODE_LABELS[mode]}</span>
                <span className="block text-xs text-gray-500">{MODE_HINTS[mode]}</span>
              </button>
            );
          })}
        </div>
      </FormField>

      {timeBound && (
        <>
          <FormField label="Start date" htmlFor="field-groupStartDate" required>
            <Input
              id="field-groupStartDate"
              name="groupStartDate"
              type="date"
              min={today}
              value={formData.groupStartDate}
              onChange={onChange}
              className={controlClass}
            />
          </FormField>

          <FormField label="End date" htmlFor="field-groupEndDate" required>
            <Input
              id="field-groupEndDate"
              name="groupEndDate"
              type="date"
              min={formData.groupStartDate || today}
              value={formData.groupEndDate}
              onChange={onChange}
              className={controlClass}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
