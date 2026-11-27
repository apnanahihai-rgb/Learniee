/**
 * Group classes (Nov 2026). A course is a group course when its `type`
 * is "Group" (the existing "Class type" select on the create-course form).
 * Pure helpers shared by the form, the API route and the course cards.
 */

import {
  compareDates,
  daysInMonth,
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

export interface GroupScheduleInput {
  groupDays?: unknown;
  groupTime?: unknown;
  groupMode?: unknown;
  groupJoinMode?: unknown;
  groupStartDate?: unknown;
  groupEndDate?: unknown;
  /** Price the teacher charges for ONE session (the course `price` field). */
  price?: unknown;
}

export interface GroupSchedule {
  days: number[];
  time: string;
  mode: GroupMode;
  joinMode: GroupJoinMode;
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

  if (!isGroupMode(input.groupMode)) {
    return { ok: false, error: "Choose whether the group is time-bound or open." };
  }

  if (!isGroupJoinMode(input.groupJoinMode)) {
    return { ok: false, error: "Choose how parents can join: monthly fixed or anytime." };
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
      joinMode: input.groupJoinMode,
      startDate,
      endDate,
      pricePerSession,
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

  return {
    days,
    time: course.groupTime,
    mode: course.groupMode,
    joinMode: isGroupJoinMode(course.groupJoinMode) ? course.groupJoinMode : null,
    startDate: toDay(course.groupStartDate),
    endDate: toDay(course.groupEndDate),
    pricePerSession,
    maxStudents: course.groupMaxStudents ?? null,
    seatsTaken: course.groupSeatsTaken ?? 0,
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
   * Verify / webhook: the order already exists and the money is taken, so
   * the date stamped on it is used as it is.
   */
  trustRequested?: boolean;
}

export type ResolveGroupStartResult =
  | { ok: true; startKey: string }
  | { ok: false; error: string; status: number };

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

  const finish = (start: CalendarDate): ResolveGroupStartResult => {
    if (groupEnd && compareDates(start, groupEnd) > 0) {
      return { ok: false, error: "This group has ended, so new students can't join.", status: 409 };
    }

    return { ok: true, startKey: toDateKey(start) };
  };

  if (mode === "TIME_BOUND") {
    if (!groupStart) return GROUP_NOT_READY;

    // Older groups: the batch starts with the group.
    if (!joinMode) return { ok: true, startKey: toDateKey(groupStart) };

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
    return { ok: true, startKey: requestedRaw ?? toDateKey(today) };
  }

  if (input.trustRequested && requestedRaw) return { ok: true, startKey: requestedRaw };

  if (today.day === 1) return { ok: true, startKey: toDateKey(today) };

  const next = today.month === 12 ? { year: today.year + 1, month: 1 } : { year: today.year, month: today.month + 1 };

  return { ok: true, startKey: toDateKey({ ...next, day: 1 }) };
}
