import type { TeacherHomeSession } from "@/features/teacher/types/home";
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

/** A session is "live" until it ends. */
export const isSessionUpcoming = (s: TeacherHomeSession, now: Date) =>
  s.end.getTime() > now.getTime();
