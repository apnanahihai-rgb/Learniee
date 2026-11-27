import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  GROUP_JOIN_MODES,
  GROUP_JOIN_MODE_LABELS,
  GROUP_MODES,
  GROUP_MODE_LABELS,
  type GroupJoinMode,
  type GroupMode,
} from "@/features/courses/utils/groupClass";
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
  onModeChange: (mode: GroupMode) => void;
  onJoinModeChange: (joinMode: GroupJoinMode) => void;
}

const MODE_HINTS: Record<GroupMode, string> = {
  TIME_BOUND: "Fixed start and end dates.",
  OPEN: "Anyone can join any time.",
};

const JOIN_MODE_HINTS: Record<GroupJoinMode, string> = {
  MONTHLY_FIXED: "Parents join at the start of a month and wait for the next one.",
  ANYTIME: "Parents can join on any date.",
};

/** Group-only fields: weekly days + time, time-bound / open, start and end dates. */
export default function CourseGroupFields({
  formData,
  availability = [],
  onChange,
  onToggleDay,
  onModeChange,
  onJoinModeChange,
}: Props) {
  const today = toDateKey(todayInPlatformTz());
  const timeBound = formData.groupMode === "TIME_BOUND";
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
        hint="The group meets on these days every week."
      >
        <div id="field-groupDays" className="flex flex-wrap gap-2" role="group" aria-label="Weekly days">
          {WEEKDAY_LABELS.map((label, day) => {
            const active = formData.groupDays.includes(day);
            const blocked = limited && !openDays.includes(day);

            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                disabled={blocked}
                title={blocked ? "Not in your availability — update it in Calendar" : undefined}
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

      <FormField
        label="Enrollment"
        htmlFor="field-groupJoinMode"
        required
        hint="When can a parent enroll a child in this group?"
      >
        <div
          id="field-groupJoinMode"
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Enrollment"
        >
          {GROUP_JOIN_MODES.map((joinMode) => {
            const active = formData.groupJoinMode === joinMode;

            return (
              <button
                key={joinMode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onJoinModeChange(joinMode)}
                className={`rounded-xl border px-4 py-2 text-left text-sm transition-colors ${
                  active
                    ? "border-violet-600 bg-violet-50 text-violet-800"
                    : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                }`}
              >
                <span className="block font-semibold">{GROUP_JOIN_MODE_LABELS[joinMode]}</span>
                <span className="block text-xs text-gray-500">{JOIN_MODE_HINTS[joinMode]}</span>
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
