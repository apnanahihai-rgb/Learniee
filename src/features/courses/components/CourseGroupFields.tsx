import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  GROUP_FORMATS,
  GROUP_FORMAT_INFO,
  groupFormatOf,
  type GroupFormat,
} from "@/features/courses/utils/groupClass";
import { parseSessionsPerWeek } from "@/features/courses/utils/courseInput";
import type { CourseFormData } from "@/features/courses/types/course";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";
import {
  availableWeekdays,
  fitsAvailability,
  type AvailabilitySlot,
} from "@/features/shared/utils/availability";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";

interface Props {
  formData: CourseFormData;
  /** Teacher's weekly availability. Days outside it can't be picked. */
  availability?: AvailabilitySlot[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  onToggleDay: (day: number) => void;
  onFormatChange: (format: GroupFormat) => void;
}

/** Group-only fields: weekly days + time, time-bound / open, start and end dates. */
export default function CourseGroupFields({
  formData,
  availability = [],
  onChange,
  onToggleDay,
  onFormatChange,
}: Props) {
  const today = toDateKey(todayInPlatformTz());
  const timeBound = formData.groupMode === "TIME_BOUND";
  const activeFormat = groupFormatOf(formData.groupMode, formData.groupJoinMode);
  const perWeek = parseSessionsPerWeek(formData.frequency);
  const pickedCount = formData.groupDays.length;
  const limited = availability.length > 0;
  const openDays = availableWeekdays(availability);
  const length = sessionLengthForCourse(formData.duration);
  const timeMisfit =
    limited && formData.groupTime
      ? formData.groupDays.filter((d) => !fitsAvailability(availability, d, formData.groupTime, length))
      : [];

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-violet-100 pt-4 md:grid-cols-2">
      <FormField
        label="Weekly days"
        htmlFor="field-groupDays"
        required
        className="md:col-span-2"
        hint={
          perWeek == null
            ? "Enter the sessions per week above first, then pick that many days."
            : `Pick exactly ${perWeek} day${perWeek > 1 ? "s" : ""} (${pickedCount} of ${perWeek} picked).`
        }
      >
        <div id="field-groupDays" className="flex flex-wrap gap-2" role="group" aria-label="Weekly days">
          {WEEKDAY_LABELS.map((label, day) => {
            const active = formData.groupDays.includes(day);
            // Locked until the sessions per week is set, and once that many days are picked.
            const full = perWeek == null || (!active && pickedCount >= perWeek);
            const blocked = (limited && !openDays.includes(day)) || full;

            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                disabled={blocked}
                title={
                  limited && !openDays.includes(day)
                    ? "Not in your availability — update it in Calendar"
                    : full && !active
                      ? perWeek == null
                        ? "Enter the sessions per week first"
                        : `Already ${perWeek} day${perWeek > 1 ? "s" : ""} picked — deselect one to change`
                      : undefined
                }
                onClick={() => onToggleDay(day)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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

      <FormField
        label="Class time (IST)"
        htmlFor="field-groupTime"
        required
        hint={
          timeMisfit.length
            ? `Outside your availability on ${timeMisfit.map((d) => WEEKDAY_LABELS[d]).join(", ")} — pick a time inside it or update Calendar.`
            : undefined
        }
      >
        <Input
          id="field-groupTime"
          name="groupTime"
          type="time"
          value={formData.groupTime}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField
        label="Group type"
        htmlFor="field-groupFormat"
        required
        hint="Also decides when a parent can enroll a child."
        className="md:col-span-2"
      >
        <div id="field-groupFormat" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Group type">
          {GROUP_FORMATS.map((format) => {
            const info = GROUP_FORMAT_INFO[format];
            const active = activeFormat === format;

            return (
              <button
                key={format}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onFormatChange(format)}
                className={`rounded-xl border px-4 py-2 text-left text-sm transition-colors ${
                  active
                    ? "border-violet-600 bg-violet-50 text-violet-800"
                    : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                }`}
              >
                <span className="block font-semibold">{info.label}</span>
                <span className="block text-xs text-gray-500">{info.hint}</span>
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
