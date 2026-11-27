/**
 * Group classes (Nov 2026). A course is a group course when its `type`
 * is "Group" (the existing "Class type" select on the create-course form).
 * Pure helpers shared by the form, the API route and the course cards.
 */

import {
  addDays,
  compareDates,
  daysBetween,
  daysInMonth,
  isValidTimeOfDay,
  parseDateKey,
  toDateKey,
  todayInPlatformTz,
  weekdayOf,
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

/**
 * How a parent may join a group:
 *  - MONTHLY_FIXED: only at the start of a monthly batch — a parent who is
 *    late waits for the next one.
 *  - ANYTIME: any date from today on.
 * Null on groups created before this option existed (old behaviour).
 */
export const GROUP_JOIN_MODES = ["MONTHLY_FIXED", "ANYTIME"] as const;
export type GroupJoinMode = (typeof GROUP_JOIN_MODES)[number];

export const GROUP_JOIN_MODE_LABELS: Record<GroupJoinMode, string> = {
  MONTHLY_FIXED: "Monthly fixed",
  ANYTIME: "Anytime",
};

/**
 * The create-course form asks ONE question ("Group type") instead of separate
 * "group type" and "enrollment" questions. Each choice sets both stored fields.
 * A fixed-period group lets parents join any date inside it.
 */
export const GROUP_FORMATS = ["TIME_BOUND", "OPEN_MONTHLY", "OPEN_ANYTIME"] as const;
export type GroupFormat = (typeof GROUP_FORMATS)[number];

export const GROUP_FORMAT_INFO: Record<
  GroupFormat,
  { label: string; hint: string; mode: GroupMode; joinMode: GroupJoinMode }
> = {
  TIME_BOUND: {
    label: "Fixed period",
    hint: "Set start and end dates. Parents can join on any date inside it.",
    mode: "TIME_BOUND",
    joinMode: "ANYTIME",
  },
  OPEN_MONTHLY: {
    label: "Ongoing · monthly batches",
    hint: "No end date. Parents join at the start of a month.",
    mode: "OPEN",
    joinMode: "MONTHLY_FIXED",
  },
  OPEN_ANYTIME: {
    label: "Ongoing · join anytime",
    hint: "No end date. Parents can join on any date.",
    mode: "OPEN",
    joinMode: "ANYTIME",
  },
};

/** Which single choice the stored mode + join mode correspond to (null if neither is set yet). */
export function groupFormatOf(mode: string | null | undefined, joinMode: string | null | undefined): GroupFormat | null {
  if (mode === "TIME_BOUND") return "TIME_BOUND";
  if (mode === "OPEN" && joinMode === "MONTHLY_FIXED") return "OPEN_MONTHLY";
  if (mode === "OPEN" && joinMode === "ANYTIME") return "OPEN_ANYTIME";

  return null;
}

export function isGroupJoinMode(value: unknown): value is GroupJoinMode {
  return typeof value === "string" && (GROUP_JOIN_MODES as readonly string[]).includes(value);
}

/**
 * Group type chosen by the Teacher (Nov 2026):
 *  - ONE_TIME: a fixed run of classes between a start and an end date.
 *  - RECURRING: no end date; renews every week (WEEKLY) or month (MONTHLY).
 * These map onto the stored `groupMode` / `groupJoinMode` so the parent
 * booking and enrollment code keeps working unchanged:
 *   ONE_TIME + mid-way joining  -> TIME_BOUND / ANYTIME
 *   ONE_TIME + no mid-way       -> TIME_BOUND / null (starts with the group)
 *   RECURRING weekly            -> OPEN / ANYTIME
 *   RECURRING monthly           -> OPEN / MONTHLY_FIXED
 */
export const GROUP_KINDS = ["ONE_TIME", "RECURRING"] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export const GROUP_KIND_INFO: Record<GroupKind, { label: string; hint: string }> = {
  ONE_TIME: { label: "One-time", hint: "A fixed set of classes between a start and an end date." },
  RECURRING: { label: "Recurring", hint: "Continues every week or month until the parent ends it." },
};

export const GROUP_RECURRENCES = ["WEEKLY", "MONTHLY"] as const;
export type GroupRecurrence = (typeof GROUP_RECURRENCES)[number];

export const GROUP_RECURRENCE_LABELS: Record<GroupRecurrence, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export const GROUP_MIN_AGE = 3;
export const GROUP_MAX_AGE = 18;

export function isGroupKind(value: unknown): value is GroupKind {
  return typeof value === "string" && (GROUP_KINDS as readonly string[]).includes(value);
}

export function isGroupRecurrence(value: unknown): value is GroupRecurrence {
  return typeof value === "string" && (GROUP_RECURRENCES as readonly string[]).includes(value);
}

/** Notices the Teacher must accept before listing a group (shown on the form). */
export const GROUP_TEACHER_NOTICES = [
  "There is no minimum number of students. Once a group is listed, you must hold every lecture as stated, even if only one student enrolls.",
  "No refunds and no drop-outs: once a parent enrolls, they are committed for that time — every selected session of a one-time group, or the full week / month of a recurring group.",
] as const;

export const GROUP_RECURRING_NOTICE =
  "Recurring groups: the next week (or month) is already committed. Parents must take the same group again the following week (or month) and can only end it after that. Parents who don't want that should choose a one-time group.";

export interface GroupScheduleInput {
  groupDays?: unknown;
  groupTime?: unknown;
  groupMode?: unknown;
  groupJoinMode?: unknown;
  groupStartDate?: unknown;
  groupEndDate?: unknown;
  /** ONE_TIME | RECURRING. */
  groupKind?: unknown;
  /** WEEKLY | MONTHLY — recurring only. */
  groupRecurrence?: unknown;
  /** One-time only: "YES" | "NO" (or a boolean) — may parents join after it has started? */
  groupAllowMidwayJoin?: unknown;
  /** Registration window, "YYYY-MM-DD" (IST). */
  groupRegStartDate?: unknown;
  groupRegEndDate?: unknown;
  groupAgeMin?: unknown;
  groupAgeMax?: unknown;
  /** The Teacher accepted the notices on the form. */
  groupTermsAccepted?: unknown;
  /** Price the teacher charges for ONE session (the course `price` field). */
  price?: unknown;
}

export interface GroupSchedule {
  days: number[];
  time: string;
  mode: GroupMode;
  /** Null for a one-time group that does not allow mid-way joining. */
  joinMode: GroupJoinMode | null;
  kind: GroupKind;
  /** Recurring only. */
  recurrence: GroupRecurrence | null;
  /** One-time only (null for recurring). */
  allowMidwayJoin: boolean | null;
  /** "YYYY-MM-DD" registration window; the end is null for an open-ended recurring group. */
  regStartDate: string;
  regEndDate: string | null;
  ageMin: number;
  ageMax: number;
  /** "YYYY-MM-DD" (IST calendar date) for TIME_BOUND, otherwise null. */
  startDate: string | null;
  endDate: string | null;
  /** What each student pays per session; the parent is charged this × the sessions in the cycle. */
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

  const rawPrice = Number(input.price);

  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    return { ok: false, error: "Enter a price per session greater than 0." };
  }

  const pricePerSession = Math.round(rawPrice * 100) / 100;

  if (pricePerSession <= 0) {
    return { ok: false, error: "Enter a price per session greater than 0." };
  }

  if (input.groupTermsAccepted !== true) {
    return { ok: false, error: "Please accept the group class notices before listing." };
  }

  const ageMin = Number(input.groupAgeMin);
  const ageMax = Number(input.groupAgeMax);

  if (
    !Number.isInteger(ageMin) ||
    !Number.isInteger(ageMax) ||
    ageMin < GROUP_MIN_AGE ||
    ageMax > GROUP_MAX_AGE ||
    ageMin > ageMax
  ) {
    return {
      ok: false,
      error: `Enter an age range between ${GROUP_MIN_AGE} and ${GROUP_MAX_AGE}, with the minimum not above the maximum.`,
    };
  }

  if (!isGroupKind(input.groupKind)) {
    return { ok: false, error: "Choose whether the group is one-time or recurring." };
  }

  const regStart = parseDateKey(typeof input.groupRegStartDate === "string" ? input.groupRegStartDate : null);
  const regEndRaw = typeof input.groupRegEndDate === "string" ? input.groupRegEndDate.trim() : "";
  const regEnd = regEndRaw ? parseDateKey(regEndRaw) : null;

  if (!regStart) {
    return { ok: false, error: "Enter the registration start date." };
  }

  if (compareDates(regStart, today) < 0) {
    return { ok: false, error: "The registration start date can't be in the past." };
  }

  if (regEndRaw && !regEnd) {
    return { ok: false, error: "The registration end date isn't a valid date." };
  }

  if (regEnd && compareDates(regEnd, regStart) < 0) {
    return { ok: false, error: "The registration end date must be on or after the registration start date." };
  }

  const base = { days, time, pricePerSession, ageMin, ageMax, regStartDate: toDateKey(regStart) };

  if (input.groupKind === "RECURRING") {
    if (!isGroupRecurrence(input.groupRecurrence)) {
      return { ok: false, error: "Choose whether the recurring group is weekly or monthly." };
    }

    return {
      ok: true,
      value: {
        ...base,
        mode: "OPEN",
        joinMode: input.groupRecurrence === "WEEKLY" ? "ANYTIME" : "MONTHLY_FIXED",
        kind: "RECURRING",
        recurrence: input.groupRecurrence,
        allowMidwayJoin: null,
        regEndDate: regEnd ? toDateKey(regEnd) : null,
        startDate: null,
        endDate: null,
      },
    };
  }

  // ONE_TIME
  const allowRaw = input.groupAllowMidwayJoin;
  const allowMidwayJoin = allowRaw === true || allowRaw === "YES" ? true : allowRaw === false || allowRaw === "NO" ? false : null;

  if (allowMidwayJoin === null) {
    return { ok: false, error: "Choose whether parents can join after the group has started." };
  }

  if (!regEnd) {
    return { ok: false, error: "Enter the registration end date for a one-time group." };
  }

  const start = parseDateKey(typeof input.groupStartDate === "string" ? input.groupStartDate : null);
  const end = parseDateKey(typeof input.groupEndDate === "string" ? input.groupEndDate : null);

  if (!start || !end) {
    return { ok: false, error: "A one-time group needs a class start date and a class end date." };
  }

  if (compareDates(start, today) < 0) {
    return { ok: false, error: "The class start date can't be in the past." };
  }

  if (compareDates(end, start) < 0) {
    return { ok: false, error: "The class end date must be on or after the class start date." };
  }

  // A cycle needs at least 4 classes, so a group shorter than that could
  // never be joined by anyone.
  if (groupClassDateKeys(days, toDateKey(start), toDateKey(end)).length < GROUP_MIN_CLASSES_LEFT) {
    return {
      ok: false,
      error: `A one-time group needs at least ${GROUP_MIN_CLASSES_LEFT} classes between the start and end dates with the weekdays you picked.`,
    };
  }

  // Classes start after registration closes. With mid-way joining the group
  // runs while registration is still open, so it only has to close by the end.
  if (allowMidwayJoin ? compareDates(regEnd, end) > 0 : compareDates(regEnd, start) >= 0) {
    return {
      ok: false,
      error: allowMidwayJoin
        ? "Registration must end on or before the class end date."
        : "Registration must end before the class start date — classes begin after registration closes.",
    };
  }

  return {
    ok: true,
    value: {
      ...base,
      mode: "TIME_BOUND",
      joinMode: allowMidwayJoin ? "ANYTIME" : null,
      kind: "ONE_TIME",
      recurrence: null,
      allowMidwayJoin,
      regEndDate: toDateKey(regEnd),
      startDate: toDateKey(start),
      endDate: toDateKey(end),
    },
  };
}

interface GroupDisplayFields {
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupJoinMode?: string | null;
  groupStartDate?: string | Date | null;
  groupEndDate?: string | Date | null;
}

/** "Monthly fixed — join at the start of a month" / "Anytime — join on any date"; null on older groups. */
export function groupJoinLabel(course: { groupJoinMode?: string | null }): string | null {
  if (course.groupJoinMode === "MONTHLY_FIXED") return "Monthly fixed — join at the start of a month";
  if (course.groupJoinMode === "ANYTIME") return "Anytime — join on any date";

  return null;
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

/* ── Mid-way joining (one-time groups) ───────────────────────────────── */

/**
 * Mid-way joining: nobody can join a one-time group when fewer than this
 * many classes are left, and registration closes automatically the day
 * before the last this-many classes begin.
 */
export const GROUP_MIN_CLASSES_LEFT = 4;

/** Safety bound for the day loops below (a group is never this long). */
const MAX_GROUP_SPAN_DAYS = 1100;

/** Every class date ("YYYY-MM-DD", ascending) of the weekly pattern from `fromKey` to `endKey`, both inclusive. */
export function groupClassDateKeys(
  days: readonly number[],
  fromKey: string | null | undefined,
  endKey: string | null | undefined,
): string[] {
  const from = parseDateKey(fromKey);
  const end = parseDateKey(endKey);

  if (!from || !end || days.length === 0) return [];

  const daySet = new Set(days);
  const span = Math.min(daysBetween(from, end) + 1, MAX_GROUP_SPAN_DAYS);
  const keys: string[] = [];

  for (let i = 0; i < span; i += 1) {
    const date = addDays(from, i);

    if (daySet.has(weekdayOf(date))) keys.push(toDateKey(date));
  }

  return keys;
}

/** How many classes of the group fall on or after `fromKey`, up to its end date. */
export function groupClassesLeft(
  days: readonly number[],
  fromKey: string | null | undefined,
  endKey: string | null | undefined,
): number {
  return groupClassDateKeys(days, fromKey, endKey).length;
}

/**
 * The latest start date that still leaves `GROUP_MIN_CLASSES_LEFT` classes
 * (the date of the 4th-last class). Null when the group has fewer than that
 * in total, or no dates.
 */
export function groupLastStartKey(
  days: readonly number[],
  startKey: string | null | undefined,
  endKey: string | null | undefined,
): string | null {
  const classes = groupClassDateKeys(days, startKey, endKey);

  return classes.length >= GROUP_MIN_CLASSES_LEFT ? classes[classes.length - GROUP_MIN_CLASSES_LEFT] : null;
}

/** Returned as the registration end of a group that can never be joined (fewer than 4 classes). */
const GROUP_NEVER_OPEN_KEY = "1970-01-01";

export interface GroupRegistrationEndInput {
  days: readonly number[];
  /** Null on groups from before the joining option existed. */
  joinMode: GroupJoinMode | null | undefined;
  mode: GroupMode | null | undefined;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  /** The registration end the teacher chose. */
  regEndDate: string | null | undefined;
}

/**
 * The last day a new student can register. For a one-time group that allows
 * mid-way joining it is the earlier of the teacher's registration end and
 * the day before the last 4 classes; everything else keeps the teacher's
 * date (null = open-ended). Pure — shared by the cards, the booking panel
 * and the server.
 */
export function groupLastRegistrationKey(input: GroupRegistrationEndInput): string | null {
  const teacherEnd = input.regEndDate ?? null;

  if (input.mode !== "TIME_BOUND" || !input.joinMode || !input.startDate || !input.endDate) {
    return teacherEnd;
  }

  const lastStart = groupLastStartKey(input.days, input.startDate, input.endDate);

  if (!lastStart) return GROUP_NEVER_OPEN_KEY;

  const lastStartDate = parseDateKey(lastStart);

  if (!lastStartDate) return teacherEnd;

  const cutoff = toDateKey(addDays(lastStartDate, -1));

  return teacherEnd && teacherEnd < cutoff ? teacherEnd : cutoff;
}

/* ── Age and registration window ────────────────────────────────────── */

/** A child's age in whole years: the stored `age`, else worked out from the date of birth. */
export function studentAgeYears(
  student: { age?: number | null; dateOfBirth?: string | Date | null },
  today: CalendarDate = todayInPlatformTz(),
): number | null {
  if (typeof student.age === "number" && Number.isFinite(student.age)) return student.age;

  if (!student.dateOfBirth) return null;

  const dob = new Date(student.dateOfBirth);

  if (Number.isNaN(dob.getTime())) return null;

  let years = today.year - dob.getUTCFullYear();
  const beforeBirthday =
    today.month < dob.getUTCMonth() + 1 || (today.month === dob.getUTCMonth() + 1 && today.day < dob.getUTCDate());

  if (beforeBirthday) years -= 1;

  return years >= 0 ? years : null;
}

/** True when the group has no age range (older groups) or the age is inside it. */
export function ageFitsGroup(
  age: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): boolean {
  if (min == null || max == null) return true;

  if (age == null) return false;

  return age >= min && age <= max;
}

export type GroupRegistrationState = "NOT_OPEN" | "OPEN" | "CLOSED";

/**
 * Where "today" sits in the group's registration window. Groups from before
 * the window existed (no start date) are always OPEN; no end date = open-ended.
 * Dates are "YYYY-MM-DD" (IST), so plain string comparison is correct.
 */
export function groupRegistrationState(
  regStart: string | null | undefined,
  regEnd: string | null | undefined,
  today: CalendarDate = todayInPlatformTz(),
): GroupRegistrationState {
  const todayKey = toDateKey(today);

  if (regStart && todayKey < regStart) return "NOT_OPEN";

  if (regEnd && todayKey > regEnd) return "CLOSED";

  return "OPEN";
}

/* ── Parent booking ─────────────────────────────────────────────────── */

/** What the parent's booking panel needs about a group course. */
export interface GroupBookingInfo {
  days: number[];
  /** "HH:mm", IST. */
  time: string;
  mode: GroupMode;
  /** Null on groups created before the joining option existed. */
  joinMode: GroupJoinMode | null;
  /** "YYYY-MM-DD" for TIME_BOUND, otherwise null. */
  startDate: string | null;
  endDate: string | null;
  /** Per session, from `Course.price`. */
  pricePerSession: number;
  maxStudents: number | null;
  seatsTaken: number;
  /** Null on groups created before the age range existed. */
  ageMin: number | null;
  ageMax: number | null;
  /** Registration window, "YYYY-MM-DD"; both null on older groups. */
  regStartDate: string | null;
  regEndDate: string | null;
  kind: GroupKind | null;
  recurrence: GroupRecurrence | null;
  /**
   * The real last registration day: the teacher's end date, or earlier for
   * a mid-way-joinable one-time group (day before the last 4 classes).
   * Null = open-ended. Use this, not `regEndDate`, to decide if joining is open.
   */
  lastRegistrationDate: string | null;
  /** Latest start date that still leaves 4 classes (mid-way joining); null when not applicable. */
  lastStartDate: string | null;
}

interface GroupBookingSource {
  type?: string | null;
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupJoinMode?: string | null;
  groupStartDate?: string | Date | null;
  groupEndDate?: string | Date | null;
  price?: string | number | null;
  groupMaxStudents?: number | null;
  groupSeatsTaken?: number | null;
  groupAgeMin?: number | null;
  groupAgeMax?: number | null;
  groupRegStartDate?: string | Date | null;
  groupRegEndDate?: string | Date | null;
  groupKind?: string | null;
  groupRecurrence?: string | null;
}

const toDay = (v: string | Date | null | undefined) =>
  v ? new Date(v).toISOString().slice(0, 10) : null;

/** Null unless the course is a fully set-up group course. */
export function groupBookingFromCourse(course: GroupBookingSource): GroupBookingInfo | null {
  if (!isGroupType(course.type)) return null;

  const pricePerSession = Number(course.price);
  const days = course.groupDays ?? [];

  if (
    !isGroupMode(course.groupMode) ||
    !course.groupTime ||
    days.length === 0 ||
    !Number.isFinite(pricePerSession) ||
    pricePerSession <= 0
  ) {
    return null;
  }

  const joinMode = isGroupJoinMode(course.groupJoinMode) ? course.groupJoinMode : null;
  const startDate = toDay(course.groupStartDate);
  const endDate = toDay(course.groupEndDate);
  const regEndDate = toDay(course.groupRegEndDate);
  const midway = course.groupMode === "TIME_BOUND" && joinMode !== null;

  return {
    days,
    time: course.groupTime,
    mode: course.groupMode,
    joinMode,
    startDate,
    endDate,
    pricePerSession,
    maxStudents: course.groupMaxStudents ?? null,
    seatsTaken: course.groupSeatsTaken ?? 0,
    ageMin: course.groupAgeMin ?? null,
    ageMax: course.groupAgeMax ?? null,
    regStartDate: toDay(course.groupRegStartDate),
    regEndDate,
    kind: isGroupKind(course.groupKind) ? course.groupKind : null,
    recurrence: isGroupRecurrence(course.groupRecurrence) ? course.groupRecurrence : null,
    lastRegistrationDate: groupLastRegistrationKey({
      days,
      joinMode,
      mode: course.groupMode,
      startDate,
      endDate,
      regEndDate,
    }),
    lastStartDate: midway ? groupLastStartKey(days, startDate, endDate) : null,
  };
}

/* ── When a new student's first cycle starts ────────────────────────── */

/** `anchor` moved forward by `n` months, keeping its day (clamped to the month's length). */
function addMonthsFromAnchor(anchor: CalendarDate, n: number): CalendarDate {
  const index = anchor.year * 12 + (anchor.month - 1) + n;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;

  return { year, month, day: Math.min(anchor.day, daysInMonth(year, month)) };
}

/**
 * The earliest day a class of the group may be held: the day after
 * registration closes. Null when there is no such limit — an open-ended
 * group (no registration end) or a one-time group with mid-way joining,
 * which runs while registration is still open.
 */
export function groupFirstClassKey(input: {
  mode: GroupMode | null | undefined;
  joinMode: GroupJoinMode | null | undefined;
  registrationEnd: string | null | undefined;
}): string | null {
  if (!input.registrationEnd) return null;

  if (input.mode === "TIME_BOUND" && input.joinMode) return null;

  const end = parseDateKey(input.registrationEnd);

  return end ? toDateKey(addDays(end, 1)) : null;
}

export interface ResolveGroupStartInput {
  mode: GroupMode;
  /** Null on groups created before the joining option existed. */
  joinMode: GroupJoinMode | null;
  /** "YYYY-MM-DD" of the group's own start / end (TIME_BOUND only). */
  groupStartDate: string | null;
  groupEndDate: string | null;
  /** The date the parent asked for, if any ("YYYY-MM-DD"). */
  requested: string | null;
  today: CalendarDate;
  /**
   * The group's weekdays. When given, a time-bound group refuses a start
   * date that leaves fewer than `GROUP_MIN_CLASSES_LEFT` classes.
   */
  days?: readonly number[];
  /**
   * The teacher's registration end date ("YYYY-MM-DD"). Classes never start
   * before the day after it (see `groupFirstClassKey`).
   */
  registrationEnd?: string | null;
  /**
   * Verify / webhook: the order already exists and the money is taken, so
   * the date stamped on it is used as it is.
   */
  trustRequested?: boolean;
}

export type ResolveGroupStartResult =
  | { ok: true; startKey: string }
  | { ok: false; error: string; status: number; reason?: "ENDED" | "TOO_FEW_LEFT" };

const GROUP_NOT_READY: ResolveGroupStartResult = {
  ok: false,
  error: "This group class isn't fully set up yet — please check back soon.",
  status: 409,
};

/**
 * The start date of a new student's first cycle in a group. Pure — the
 * booking panel (to show the date) and the server (to price and charge)
 * share it, and the server is authoritative.
 *
 *  - ANYTIME: the date the parent picks (today if none). In a time-bound
 *    group never before the group's start; never after its end.
 *  - MONTHLY_FIXED: the next monthly batch start, the parent's date is
 *    ignored. Open group: the 1st of the month (today if it is the 1st).
 *    Time-bound group: the group's start day each month.
 *  - No join mode (older groups): time-bound starts with the group; open
 *    uses the parent's date.
 */
export function resolveGroupStartDate(input: ResolveGroupStartInput): ResolveGroupStartResult {
  const { mode, joinMode, today } = input;
  const requestedRaw = input.requested?.trim() || null;
  const groupStart = parseDateKey(input.groupStartDate);
  const groupEnd = parseDateKey(input.groupEndDate);

  // Classes start after registration closes: never earlier than this day.
  // Skipped when the money is already taken (the stamped date stands).
  const earliest = input.trustRequested
    ? null
    : parseDateKey(
        groupFirstClassKey({ mode, joinMode, registrationEnd: input.registrationEnd ?? null }),
      );
  const notBefore = (date: CalendarDate): CalendarDate =>
    earliest && compareDates(date, earliest) < 0 ? earliest : date;

  const finish = (start: CalendarDate): ResolveGroupStartResult => {
    if (groupEnd && compareDates(start, groupEnd) > 0) {
      return { ok: false, error: "This group has ended, so new students can't join.", status: 409, reason: "ENDED" };
    }

    if (groupEnd && input.days && groupClassesLeft(input.days, toDateKey(start), toDateKey(groupEnd)) < GROUP_MIN_CLASSES_LEFT) {
      return {
        ok: false,
        error: `Fewer than ${GROUP_MIN_CLASSES_LEFT} classes are left in this group, so new students can't join.`,
        status: 409,
        reason: "TOO_FEW_LEFT",
      };
    }

    return { ok: true, startKey: toDateKey(start) };
  };

  if (mode === "TIME_BOUND") {
    if (!groupStart) return GROUP_NOT_READY;

    // Older groups: the batch starts with the group.
    if (!joinMode) return { ok: true, startKey: toDateKey(notBefore(groupStart)) };

    if (input.trustRequested && requestedRaw) return { ok: true, startKey: requestedRaw };

    if (joinMode === "ANYTIME") {
      const wanted = requestedRaw ? parseDateKey(requestedRaw) : today;

      if (!wanted) {
        return { ok: false, error: "That doesn't look like a valid start date — pick again.", status: 400 };
      }

      return finish(compareDates(wanted, groupStart) < 0 ? groupStart : wanted);
    }

    // MONTHLY_FIXED: the first monthly batch start on or after today.
    let batch = groupStart;

    for (let n = 1; compareDates(batch, today) < 0 && n <= 600; n += 1) {
      batch = addMonthsFromAnchor(groupStart, n);
    }

    return finish(batch);
  }

  // OPEN group.
  if (joinMode !== "MONTHLY_FIXED") {
    if (!earliest) return { ok: true, startKey: requestedRaw ?? toDateKey(today) };

    const wanted = requestedRaw ? parseDateKey(requestedRaw) : today;

    if (!wanted) {
      return { ok: false, error: "That doesn't look like a valid start date — pick again.", status: 400 };
    }

    return { ok: true, startKey: toDateKey(notBefore(wanted)) };
  }

  if (input.trustRequested && requestedRaw) return { ok: true, startKey: requestedRaw };

  // The first monthly batch start on or after today and after registration closes.
  const ref = notBefore(today);

  if (ref.day === 1) return { ok: true, startKey: toDateKey(ref) };

  const next = ref.month === 12 ? { year: ref.year + 1, month: 1 } : { year: ref.year, month: ref.month + 1 };

  return { ok: true, startKey: toDateKey({ ...next, day: 1 }) };
}
