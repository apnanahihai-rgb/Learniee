import type { TeacherHomeSession } from "./teacherHomeTypes";
import { KID_PALETTE, SUBJECT_COLOR } from "@/features/parent/components/home/homeLogic";

/** One colour per student — the only categorical colour on the page (same palette as the Parent Home). */
export function studentColor(names: string[], name: string): string | null {
  const first = name.split(" ")[0];
  const i = names.findIndex((n) => n === name || n.split(" ")[0] === first);
  return i >= 0 ? KID_PALETTE[i % KID_PALETTE.length] : null;
}

const SUBJECT_GLYPH: Record<string, string> = {
  Mathematics: "∑",
  Science: "Sc",
  English: "Aa",
  Physics: "Φ",
};

const FALLBACK = "#5931a2";

/** Course colour + glyph (subject initial when there is no special glyph). */
export function subjectStyle(subject: string | null): { color: string; glyph: string } {
  const s = subject ?? "";
  const color = SUBJECT_COLOR[s] ?? (s === "Science" ? "#0f766e" : FALLBACK);
  return { color, glyph: SUBJECT_GLYPH[s] ?? (s[0]?.toUpperCase() || "?") };
}

/** A session is "live" until it ends (class length falls back to 45 min when unknown). */
export const isSessionUpcoming = (s: TeacherHomeSession, now: Date) =>
  s.end.getTime() > now.getTime();

const DEFAULT_CLASS_MINUTES = 45;

/** "YYYY-MM-DD" + "HH:mm" (legacy sessions without real instants) → local Date. */
export function parseLocalSlot(date: string, time: string | null): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export const defaultEnd = (start: Date) => new Date(start.getTime() + DEFAULT_CLASS_MINUTES * 60_000);
