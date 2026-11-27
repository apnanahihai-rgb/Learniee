import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import {
  GROUP_KINDS,
  GROUP_KIND_INFO,
  GROUP_MAX_AGE,
  GROUP_MIN_AGE,
  GROUP_RECURRENCES,
  GROUP_RECURRENCE_LABELS,
  GROUP_RECURRING_NOTICE,
  GROUP_TEACHER_NOTICES,
  type GroupKind,
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
  onKindChange: (kind: GroupKind) => void;
  onTermsChange: (accepted: boolean) => void;
}

/** Group-only fields: days, time, age range, registration window, group type and notices. */
export default function CourseGroupFields({
  formData,
  availability = [],
  onChange,
  onToggleDay,
  onKindChange,
  onTermsChange,
}: Props) {
  const today = toDateKey(todayInPlatformTz());
  const oneTime = formData.groupKind === "ONE_TIME";
  const recurring = formData.groupKind === "RECURRING";
  const regMin = formData.groupRegStartDate || today;
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

      <FormField label="Student age range" htmlFor="field-groupAgeMin" required hint={`In years, ${GROUP_MIN_AGE} to ${GROUP_MAX_AGE}.`}>
        <div className="flex items-center gap-2">
          <Input
            id="field-groupAgeMin"
            name="groupAgeMin"
            type="number"
            inputMode="numeric"
            min={GROUP_MIN_AGE}
            max={GROUP_MAX_AGE}
            placeholder="From"
            aria-label="Minimum age"
            value={formData.groupAgeMin}
            onChange={onChange}
            className={controlClass}
          />
          <span className="text-sm text-gray-500">to</span>
          <Input
            name="groupAgeMax"
            type="number"
            inputMode="numeric"
            min={GROUP_MIN_AGE}
            max={GROUP_MAX_AGE}
            placeholder="To"
            aria-label="Maximum age"
            value={formData.groupAgeMax}
            onChange={onChange}
            className={controlClass}
          />
        </div>
      </FormField>

      <div className="hidden md:block" aria-hidden="true" />

      <FormField label="Registration start date" htmlFor="field-groupRegStartDate" required>
        <Input
          id="field-groupRegStartDate"
          name="groupRegStartDate"
          type="date"
          min={today}
          value={formData.groupRegStartDate}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField
        label="Registration end date"
        htmlFor="field-groupRegEndDate"
        required={oneTime}
        hint={recurring ? "Optional — leave empty to keep registration open." : undefined}
      >
        <Input
          id="field-groupRegEndDate"
          name="groupRegEndDate"
          type="date"
          min={regMin}
          value={formData.groupRegEndDate}
          onChange={onChange}
          className={controlClass}
        />
      </FormField>

      <FormField label="Group type" htmlFor="field-groupKind" required className="md:col-span-2">
        <div id="field-groupKind" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Group type">
          {GROUP_KINDS.map((kind) => {
            const info = GROUP_KIND_INFO[kind];
            const active = formData.groupKind === kind;

            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onKindChange(kind)}
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

      {recurring && (
        <FormField label="Repeats" htmlFor="field-groupRecurrence" required className="md:col-span-2">
          <div id="field-groupRecurrence" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Repeats">
            {GROUP_RECURRENCES.map((value) => {
              const active = formData.groupRecurrence === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ target: { name: "groupRecurrence", value } } as React.ChangeEvent<HTMLInputElement>)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                  }`}
                >
                  {GROUP_RECURRENCE_LABELS[value]}
                </button>
              );
            })}
          </div>
        </FormField>
      )}

      {oneTime && (
        <>
          <FormField label="Class start date" htmlFor="field-groupStartDate" required>
            <Input
              id="field-groupStartDate"
              name="groupStartDate"
              type="date"
              min={formData.groupRegStartDate || today}
              value={formData.groupStartDate}
              onChange={onChange}
              className={controlClass}
            />
          </FormField>

          <FormField label="Class end date" htmlFor="field-groupEndDate" required>
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

          <FormField
            label="Allow joining after the group has started?"
            htmlFor="field-groupAllowMidwayJoin"
            required
            hint="If yes, a parent who joins late pays only for the classes still left. Nobody can join when fewer than 4 classes are left — registration closes automatically the day before the last 4 classes. If no, registration must end on or before the class start date."
            className="md:col-span-2"
          >
            <div id="field-groupAllowMidwayJoin" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Allow mid-way joining">
              {(["YES", "NO"] as const).map((value) => {
                const active = formData.groupAllowMidwayJoin === value;

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ target: { name: "groupAllowMidwayJoin", value } } as React.ChangeEvent<HTMLInputElement>)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-violet-200 bg-white text-gray-600 hover:bg-violet-50"
                    }`}
                  >
                    {value === "YES" ? "Yes, allow mid-way joining" : "No, only from the start"}
                  </button>
                );
              })}
            </div>
          </FormField>
        </>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:col-span-2">
        <p className="font-semibold">Please read before listing a group class</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          {GROUP_TEACHER_NOTICES.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
          {recurring && <li>{GROUP_RECURRING_NOTICE}</li>}
        </ul>

        <label className="mt-3 flex items-start gap-2 font-medium">
          <input
            type="checkbox"
            name="groupTermsAccepted"
            checked={formData.groupTermsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-600"
          />
          <span>I understand and accept these conditions.</span>
        </label>
      </div>
    </div>
  );
}
