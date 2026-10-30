/**
 * Teacher weekly availability — pure helpers shared by the Teacher editor,
 * the Parent booking screens and the server checks. Times are platform
 * timezone (IST) wall-clock "HH:mm"; `dayOfWeek` 0 = Sunday.
 */

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const MAX_SLOTS_PER_DAY = 6;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function timeToMinutes(time: string): number | null {
  const m = TIME_RE.exec(time ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Validates and tidies a submitted week: drops nothing silently — returns an
 * error string for bad input, otherwise slots sorted by day/start with
 * touching or overlapping windows on one day merged.
 */
export function normalizeAvailability(
  input: unknown,
): { slots: AvailabilitySlot[] } | { error: string } {
  if (!Array.isArray(input)) {
    return { error: "Availability must be a list of time slots." };
  }

  const byDay = new Map<number, Array<[number, number]>>();

  for (const raw of input) {
    const slot = raw as Partial<AvailabilitySlot> | null;
    const day = slot?.dayOfWeek;

    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) {
      return { error: "Each slot needs a valid day of the week." };
    }

    const start = timeToMinutes(String(slot?.startTime ?? ""));
    const end = timeToMinutes(String(slot?.endTime ?? ""));

    if (start == null || end == null) {
      return { error: "Times must look like 16:30." };
    }

    if (end <= start) {
      return { error: "Each slot must end after it starts." };
    }

    if (end - start < 30) {
      return { error: "Each slot must be at least 30 minutes long." };
    }

    byDay.set(day, [...(byDay.get(day) ?? []), [start, end]]);
  }

  const slots: AvailabilitySlot[] = [];

  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const ranges = byDay.get(day)!.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];

    for (const [s, e] of ranges) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) {
        last[1] = Math.max(last[1], e);
      } else {
        merged.push([s, e]);
      }
    }

    if (merged.length > MAX_SLOTS_PER_DAY) {
      return { error: `At most ${MAX_SLOTS_PER_DAY} time slots per day.` };
    }

    for (const [s, e] of merged) {
      slots.push({ dayOfWeek: day, startTime: minutesToTime(s), endTime: minutesToTime(e) });
    }
  }

  if (slots.length === 0) {
    return { error: "Add at least one time slot." };
  }

  return { slots };
}

/** Does [startTime, startTime + lengthMinutes] sit fully inside one slot of that weekday? */
export function fitsAvailability(
  slots: AvailabilitySlot[],
  dayOfWeek: number,
  startTime: string,
  lengthMinutes: number,
): boolean {
  const start = timeToMinutes(startTime);
  if (start == null) return false;
  const end = start + lengthMinutes;

  return slots.some((s) => {
    if (s.dayOfWeek !== dayOfWeek) return false;
    const a = timeToMinutes(s.startTime);
    const b = timeToMinutes(s.endTime);
    return a != null && b != null && start >= a && end <= b;
  });
}

/** Hour starts (0-23) on a weekday where a session of `lengthMinutes` fits. */
export function availableHours(
  slots: AvailabilitySlot[],
  dayOfWeek: number,
  lengthMinutes = 60,
): number[] {
  const hours: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (fitsAvailability(slots, dayOfWeek, minutesToTime(h * 60), lengthMinutes)) {
      hours.push(h);
    }
  }
  return hours;
}

export function availableWeekdays(slots: AvailabilitySlot[]): number[] {
  return [...new Set(slots.map((s) => s.dayOfWeek))].sort((a, b) => a - b);
}

function parts12(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24;
  return {
    h: h24 % 12 === 0 ? 12 : h24 % 12,
    m: minutes % 60,
    period: h24 >= 12 ? "PM" : "AM",
  };
}

/** "16:30" -> "4:30 PM" */
export function formatTime12(time: string): string {
  const mins = timeToMinutes(time);
  if (mins == null) return time;
  const { h, m, period } = parts12(mins);
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/** 16:00–20:00 -> "4–8 PM"; 09:00–13:30 -> "9 AM–1:30 PM" */
export function formatSlotRange(slot: { startTime: string; endTime: string }): string {
  const a = timeToMinutes(slot.startTime);
  const b = timeToMinutes(slot.endTime);
  if (a == null || b == null) return "";
  const x = parts12(a);
  const y = parts12(b);
  const fmt = (p: ReturnType<typeof parts12>) =>
    p.m ? `${p.h}:${String(p.m).padStart(2, "0")}` : `${p.h}`;
  return x.period === y.period
    ? `${fmt(x)}–${fmt(y)} ${y.period}`
    : `${fmt(x)} ${x.period}–${fmt(y)} ${y.period}`;
}

/**
 * Start times (every 30 min, plus each slot's own start) at which a session of
 * `lengthMinutes` fits inside the availability on EVERY given weekday.
 */
export function commonStartTimes(
  slots: AvailabilitySlot[],
  days: number[],
  lengthMinutes: number,
): string[] {
  if (days.length === 0) return [];

  const candidates = new Set<number>();
  for (let m = 0; m < 24 * 60; m += 30) candidates.add(m);
  for (const s of slots) {
    const a = timeToMinutes(s.startTime);
    if (a != null) candidates.add(a);
  }

  return [...candidates]
    .sort((a, b) => a - b)
    .map(minutesToTime)
    .filter((t) => days.every((d) => fitsAvailability(slots, d, t, lengthMinutes)));
}
