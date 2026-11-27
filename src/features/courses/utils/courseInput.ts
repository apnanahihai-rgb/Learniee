import { formatGradeRange, parseGradeRange } from "@/features/courses/utils/coursePricing";

/**
 * Resolves the "Other" / "Custom" / grade-range choices on the create-course
 * form into the plain strings stored on `Course`. Pure, so the form and the
 * API route share one rule; the route is authoritative.
 */

export interface CourseChoiceInput {
  subject?: string;
  subjectOther?: string;
  grade?: string;
  frequency?: string;
  frequencyCustom?: string;
  language?: string;
  languageOther?: string;
  modules?: string;
  moduleCustom?: string;
}

export type NormalizedCourseChoices =
  | { ok: true; subject: string; grade: string; frequency: string; modules: string; language: string }
  | { ok: false; error: string };

export const MIN_SESSIONS_PER_WEEK = 1;
export const MAX_SESSIONS_PER_WEEK = 7;

/** Whole number of sessions a week (1-7) from the form's number input; null if invalid or empty. */
export function parseSessionsPerWeek(raw: unknown): number | null {
  const text = String(raw ?? "").trim();

  if (!/^\d+$/.test(text)) return null;

  const n = Number(text);

  return n >= MIN_SESSIONS_PER_WEEK && n <= MAX_SESSIONS_PER_WEEK ? n : null;
}

/** The stored frequency text for a number of sessions a week ("Weekly", "3 Days a Week", "Daily"). */
export function formatFrequency(sessionsPerWeek: number): string {
  if (sessionsPerWeek === 1) return "Weekly";
  if (sessionsPerWeek === 7) return "Daily";

  return `${sessionsPerWeek} Days a Week`;
}

const MAX_SUBJECT = 80;
const MAX_FREQUENCY = 60;
const MAX_MODULES = 50;
const MAX_LANGUAGE = 40;

export function normalizeCourseChoices(input: CourseChoiceInput): NormalizedCourseChoices {
  let subject = (input.subject ?? "").trim();

  if (subject === "Other") {
    subject = (input.subjectOther ?? "").trim();

    if (!subject) return { ok: false, error: "Please write the subject name." };
    if (subject.length > MAX_SUBJECT) {
      return { ok: false, error: `Subject must be ${MAX_SUBJECT} characters or fewer.` };
    }
  }

  let grade = "";

  if (input.grade?.trim()) {
    const range = parseGradeRange(input.grade);
    const formatted = range ? formatGradeRange(range.from, range.to) : null;

    if (!formatted) {
      return { ok: false, error: "Select a valid grade, or a range from a lower to a higher grade." };
    }

    grade = formatted;
  }

  let frequency = (input.frequency ?? "").trim();

  if (/^\d+$/.test(frequency)) {
    // The form sends the number of sessions a week.
    const perWeek = parseSessionsPerWeek(frequency);

    if (perWeek == null) {
      return {
        ok: false,
        error: `Sessions per week must be a whole number from ${MIN_SESSIONS_PER_WEEK} to ${MAX_SESSIONS_PER_WEEK}.`,
      };
    }

    frequency = formatFrequency(perWeek);
  } else if (frequency === "Custom") {
    frequency = (input.frequencyCustom ?? "").trim();

    if (!frequency) return { ok: false, error: "Please describe the custom frequency." };
    if (frequency.length > MAX_FREQUENCY) {
      return { ok: false, error: `Frequency must be ${MAX_FREQUENCY} characters or fewer.` };
    }
  }

  let language = (input.language ?? "").trim();

  if (language === "Other") {
    language = (input.languageOther ?? "").trim();

    if (!language) return { ok: false, error: "Please write the language name." };
    if (language.length > MAX_LANGUAGE) {
      return { ok: false, error: `Language must be ${MAX_LANGUAGE} characters or fewer.` };
    }
  }

  let modules = (input.modules ?? "").trim();

  if (modules === "No Modules") {
    // Nothing to store: the course simply has no modules.
    modules = "";
  } else if (modules === "All") {
    modules = "All Modules";
  } else if (modules === "Custom") {
    const count = Number(input.moduleCustom);

    if (!Number.isInteger(count) || count < 1 || count > MAX_MODULES) {
      return { ok: false, error: `Number of modules must be a whole number from 1 to ${MAX_MODULES}.` };
    }

    modules = count === 1 ? "1 Module" : `${count} Modules`;
  }

  return { ok: true, subject, grade, frequency, modules, language };
}
