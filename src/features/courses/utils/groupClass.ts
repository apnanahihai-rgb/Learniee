/**
 * Group classes (Nov 2026). A course is a group course when its `type`
 * is "Group" (the existing "Class type" select on the create-course form).
 * Pure helpers shared by the form, the API route and the course cards.
 */

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
