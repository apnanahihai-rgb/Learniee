/**
 * Group classes (Nov 2026). A course is a group course when its `type`
 * is "Group" (the existing "Class type" select on the create-course form).
 * Pure helpers shared by the form, the API route and the course cards.
 */

import {
  compareDates,
  isValidTimeOfDay,
  parseDateKey,
  toDateKey,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";

export const GROUP_CLASS_TYPE = "Group";

/** Temporary single group option: the most students one group may have. */
export const GROUP_MIN_STUDENTS = 2;
export const GROUP_MAX_STUDENTS_LIMIT = 50;

export function isGroupType(type: string | null | undefined): boolean {
  return (type ?? "").trim().toLowerCase() === GROUP_CLASS_TYPE.toLowerCase();
}

export type GroupSizeResult = { ok: true; value: number } | { ok: false; error: string };

export function parseGroupMaxStudents(raw: unknown): GroupSizeResult {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());

  if (!Number.isInteger(n) || n < GROUP_MIN_STUDENTS || n > GROUP_MAX_STUDENTS_LIMIT) {
    return {
      ok: false,
      error: `Group size must be a whole number from ${GROUP_MIN_STUDENTS} to ${GROUP_MAX_STUDENTS_LIMIT}.`,
    };
  }

  return { ok: true, value: n };
}

/** "Group · up to 6 students" (or just "Group" when the size is unknown). */
export function groupLabel(maxStudents: number | null | undefined): string {
  return maxStudents ? `Group · up to ${maxStudents} students` : "Group";
}

/* ── Group schedule, mode and price per cycle ───────────────────────── */

export const GROUP_MODES = ["TIME_BOUND", "OPEN"] as const;
export type GroupMode = (typeof GROUP_MODES)[number];

export const GROUP_MODE_LABELS: Record<GroupMode, string> = {
  TIME_BOUND: "Time-bound",
  OPEN: "Open",
};

/** Sessions assumed per cycle (one month ≈ 4 weeks) to derive a per-session price. */
const WEEKS_PER_CYCLE = 4;

export interface GroupScheduleInput {
  groupDays?: unknown;
  groupTime?: unknown;
  groupMode?: unknown;
  groupStartDate?: unknown;
  groupEndDate?: unknown;
  groupPricePerCycle?: unknown;
}

export interface GroupSchedule {
  days: number[];
  time: string;
  mode: GroupMode;
  /** "YYYY-MM-DD" (IST calendar date) for TIME_BOUND, otherwise null. */
  startDate: string | null;
  endDate: string | null;
  pricePerCycle: number;
  /** Derived: price per cycle ÷ (days per week × 4), 2 decimals. */
  pricePerSession: number;
}

export type GroupScheduleResult = { ok: true; value: GroupSchedule } | { ok: false; error: string };

export function isGroupMode(value: unknown): value is GroupMode {
  return typeof value === "string" && (GROUP_MODES as readonly string[]).includes(value);
}

/**
 * Validates the group-only fields. Pure — the form and the API route share it
 * and the route is authoritative. `today` is injectable for tests.
 */
export function parseGroupSchedule(
  input: GroupScheduleInput,
  today: CalendarDate = todayInPlatformTz(),
): GroupScheduleResult {
  const rawDays = Array.isArray(input.groupDays) ? input.groupDays : [];
  const days = [...new Set(rawDays.map(Number))].sort((a, b) => a - b);

  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return { ok: false, error: "Pick at least one weekday for the group class." };
  }

  const time = typeof input.groupTime === "string" ? input.groupTime.trim() : "";

  if (!isValidTimeOfDay(time)) {
    return { ok: false, error: "Enter the class time (IST) for the group class." };
  }

  const pricePerCycle = Number(input.groupPricePerCycle);

  if (!Number.isFinite(pricePerCycle) || pricePerCycle <= 0) {
    return { ok: false, error: "Enter a price per cycle greater than 0." };
  }

  const pricePerSession = Math.round((pricePerCycle / (days.length * WEEKS_PER_CYCLE)) * 100) / 100;

  if (pricePerSession <= 0) {
    return { ok: false, error: "The price per cycle is too low for this many sessions." };
  }

  if (!isGroupMode(input.groupMode)) {
    return { ok: false, error: "Choose whether the group is time-bound or open." };
  }

  let startDate: string | null = null;
  let endDate: string | null = null;

  if (input.groupMode === "TIME_BOUND") {
    const start = parseDateKey(typeof input.groupStartDate === "string" ? input.groupStartDate : null);
    const end = parseDateKey(typeof input.groupEndDate === "string" ? input.groupEndDate : null);

    if (!start || !end) {
      return { ok: false, error: "A time-bound group needs a start date and an end date." };
    }

    if (compareDates(start, today) < 0) {
      return { ok: false, error: "The start date can't be in the past." };
    }

    if (compareDates(end, start) < 0) {
      return { ok: false, error: "The end date must be on or after the start date." };
    }

    startDate = toDateKey(start);
    endDate = toDateKey(end);
  }

  return {
    ok: true,
    value: {
      days,
      time,
      mode: input.groupMode,
      startDate,
      endDate,
      pricePerCycle: Math.round(pricePerCycle * 100) / 100,
      pricePerSession,
    },
  };
}

interface GroupDisplayFields {
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupStartDate?: string | Date | null;
  groupEndDate?: string | Date | null;
}

/** "Open — anyone can join any time" / "Time-bound · 1 Dec 2026 – 28 Feb 2027". */
export function groupModeLabel(course: GroupDisplayFields): string {
  if (course.groupMode === "OPEN") return "Open — anyone can join any time";

  if (course.groupMode === "TIME_BOUND") {
    const fmt = (v: string | Date | null | undefined) => {
      if (!v) return "?";
      const d = new Date(v);

      return Number.isNaN(d.getTime())
        ? "?"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    };

    return `Time-bound · ${fmt(course.groupStartDate)} – ${fmt(course.groupEndDate)}`;
  }

  return "-";
}

/* ── Parent booking ─────────────────────────────────────────────────── */

/** What the parent's booking panel needs about a group course. */
export interface GroupBookingInfo {
  days: number[];
  /** "HH:mm", IST. */
  time: string;
  mode: GroupMode;
  /** "YYYY-MM-DD" for TIME_BOUND, otherwise null. */
  startDate: string | null;
  endDate: string | null;
  pricePerCycle: number;
  maxStudents: number | null;
  seatsTaken: number;
}

interface GroupBookingSource {
  type?: string | null;
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupStartDate?: string | Date | null;
  groupEndDate?: string | Date | null;
  groupPricePerCycle?: string | number | null;
  groupMaxStudents?: number | null;
  groupSeatsTaken?: number | null;
}

const toDay = (v: string | Date | null | undefined) =>
  v ? new Date(v).toISOString().slice(0, 10) : null;

/** Null unless the course is a fully set-up group course. */
export function groupBookingFromCourse(course: GroupBookingSource): GroupBookingInfo | null {
  if (!isGroupType(course.type)) return null;

  const pricePerCycle = Number(course.groupPricePerCycle);
  const days = course.groupDays ?? [];

  if (
    !isGroupMode(course.groupMode) ||
    !course.groupTime ||
    days.length === 0 ||
    !Number.isFinite(pricePerCycle) ||
    pricePerCycle <= 0
  ) {
    return null;
  }

  return {
    days,
    time: course.groupTime,
    mode: course.groupMode,
    startDate: toDay(course.groupStartDate),
    endDate: toDay(course.groupEndDate),
    pricePerCycle,
    maxStudents: course.groupMaxStudents ?? null,
    seatsTaken: course.groupSeatsTaken ?? 0,
  };
}
