/**
 * Course creation vs the Teacher's weekly availability (Calendar).
 * Pure — the create-course form and the API route share it; the route is
 * authoritative. Times are IST wall-clock "HH:mm", weekdays 0 = Sunday.
 */

import {
  availableWeekdays,
  fitsAvailability,
  formatSlotRange,
  timeToMinutes,
  type AvailabilitySlot,
} from "@/features/shared/utils/availability";
import { isGroupType } from "@/features/courses/utils/groupClass";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { WEEKDAY_LABELS_FULL } from "@/features/shared/utils/weekdays";

export const AVAILABILITY_MISMATCH_CODE = "AVAILABILITY_MISMATCH";

const TIME_SLOT_WINDOWS: Record<string, [number, number]> = {
  Morning: [0, 12 * 60],
  Afternoon: [12 * 60, 17 * 60],
  Evening: [17 * 60, 24 * 60],
};

const FIXED_FREQUENCY_DAYS: Record<string, number> = {
  Daily: 7,
  "5 Days a Week": 5,
  "3 Days a Week": 3,
  Weekly: 1,
};

export interface CourseAvailabilityInput {
  type?: string | null;
  duration?: string | null;
  /** Resolved frequency text ("Daily", "3 Days a Week", or the custom text). */
  frequency?: string | null;
  timeSlot?: string | null;
  groupDays?: number[] | null;
  groupTime?: string | null;
}

export type CourseAvailabilityResult = { ok: true } | { ok: false; error: string };

/** Days per week a frequency needs; null when it can't be read (custom free text). */
export function daysPerWeekForFrequency(frequency: string | null | undefined): number | null {
  const text = (frequency ?? "").trim();

  if (!text) return null;
  if (text in FIXED_FREQUENCY_DAYS) return FIXED_FREQUENCY_DAYS[text];
  if (/^[1-7]$/.test(text)) return Number(text);

  const match = /(\d)\s*(?:days?|x|times?)/i.exec(text);
  const n = match ? Number(match[1]) : NaN;

  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
}

/** Can a session of `length` minutes fit inside the time-of-day window on some availability slot? */
function slotFitsWindow(slots: AvailabilitySlot[], window: [number, number], length: number): boolean {
  return slots.some((s) => {
    const a = timeToMinutes(s.startTime);
    const b = timeToMinutes(s.endTime);

    if (a == null || b == null) return false;

    return Math.min(b, window[1]) - Math.max(a, window[0]) >= length;
  });
}

export function checkCourseAgainstAvailability(
  slots: AvailabilitySlot[],
  input: CourseAvailabilityInput,
): CourseAvailabilityResult {
  const length = sessionLengthForCourse(input.duration);
  const weekdays = availableWeekdays(slots);

  const needed = daysPerWeekForFrequency(input.frequency);

  if (isGroupType(input.type)) {
    const pickedDays = (input.groupDays ?? []).length;

    // A group meets exactly as many days a week as the sessions per week entered.
    if (needed != null && pickedDays !== needed) {
      return {
        ok: false,
        error: `Sessions per week is ${needed}, so pick exactly ${needed} weekly day${needed > 1 ? "s" : ""} for the group (you picked ${pickedDays}).`,
      };
    }

    const time = (input.groupTime ?? "").trim();

    for (const day of input.groupDays ?? []) {
      if (!fitsAvailability(slots, day, time, length)) {
        const daySlots = slots.filter((s) => s.dayOfWeek === day);
        const open = daySlots.length
          ? `Your availability on ${WEEKDAY_LABELS_FULL[day]} is ${daySlots.map(formatSlotRange).join(", ")}.`
          : `You haven't set any availability on ${WEEKDAY_LABELS_FULL[day]}.`;

        return {
          ok: false,
          error: `This group class doesn't fit your availability. ${open} Update your availability in Calendar, then create the course again.`,
        };
      }
    }

    return { ok: true };
  }

  if (needed != null && weekdays.length < needed) {
    return {
      ok: false,
      error: `"${input.frequency}" needs ${needed} available day${needed > 1 ? "s" : ""} a week, but you've only set ${weekdays.length}. Update your availability in Calendar, then create the course again.`,
    };
  }

  const window = input.timeSlot ? TIME_SLOT_WINDOWS[input.timeSlot] : undefined;

  if (window && !slotFitsWindow(slots, window, length)) {
    return {
      ok: false,
      error: `You haven't set availability in the ${input.timeSlot?.toLowerCase()} long enough for a ${length}-minute class. Update your availability in Calendar, then create the course again.`,
    };
  }

  return { ok: true };
}
