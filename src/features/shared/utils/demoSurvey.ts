/**
 * Post-demo survey (Parent journey, Oct 2026) — shared by the survey UI
 * and the server so the options and the routing rule live in one place.
 *
 * Three taps, no typing:
 *   Q1 overall   — GREAT | OKAY | NOT_GOOD
 *   Q2 levelFit  — YES | SOMEWHAT | NO
 *   Q3 intent    — ENROLL | NEED_TIME | NO
 * plus one optional reason chip when the demo went badly.
 *
 * Routing (decided by Q1 + Q3 only):
 *   POSITIVE  — Q1 Great/Okay AND Q3 Enroll
 *   NEGATIVE  — Q1 Not good OR Q3 No ... unless the two conflict (below)
 *   UNDECIDED — Q3 Need time, and any Q1/Q3 conflict
 *
 * Q1 + Q3 conflict (e.g. "Great" but "No", or "Not good" but "Enroll")
 * is treated as UNDECIDED, per the journey doc.
 */

export const DEMO_RATINGS = ["GREAT", "OKAY", "NOT_GOOD"] as const;
export const DEMO_FITS = ["YES", "SOMEWHAT", "NO"] as const;
export const DEMO_INTENTS = ["ENROLL", "NEED_TIME", "NO"] as const;
export const DEMO_REASONS = [
  "LATE",
  "UNCLEAR",
  "LEVEL_MISMATCH",
  "TECH_ISSUE",
  "OTHER",
] as const;

export type DemoRatingValue = (typeof DEMO_RATINGS)[number];
export type DemoFitValue = (typeof DEMO_FITS)[number];
export type DemoIntentValue = (typeof DEMO_INTENTS)[number];
export type DemoReasonValue = (typeof DEMO_REASONS)[number];
export type DemoSurveyOutcomeValue = "POSITIVE" | "UNDECIDED" | "NEGATIVE";

export const DEMO_RATING_LABELS: Record<DemoRatingValue, string> = {
  GREAT: "😀 Great",
  OKAY: "😐 Okay",
  NOT_GOOD: "🙁 Not good",
};

export const DEMO_FIT_LABELS: Record<DemoFitValue, string> = {
  YES: "Yes",
  SOMEWHAT: "Somewhat",
  NO: "No",
};

export const DEMO_INTENT_LABELS: Record<DemoIntentValue, string> = {
  ENROLL: "Yes, enroll",
  NEED_TIME: "Need time",
  NO: "No",
};

export const DEMO_REASON_LABELS: Record<DemoReasonValue, string> = {
  LATE: "Teacher was late",
  UNCLEAR: "Unclear teaching",
  LEVEL_MISMATCH: "Level mismatch",
  TECH_ISSUE: "Tech issue",
  OTHER: "Other",
};

/** Q1 + Q3 → routing bucket. Pure; no I/O. */
export function deriveDemoSurveyOutcome(
  overall: DemoRatingValue,
  intent: DemoIntentValue,
): DemoSurveyOutcomeValue {
  const happy = overall === "GREAT" || overall === "OKAY";

  if (happy && intent === "ENROLL") return "POSITIVE";
  if (overall === "NOT_GOOD" && intent === "NO") return "NEGATIVE";
  if (overall === "NOT_GOOD" && intent === "NEED_TIME") return "NEGATIVE";
  if (happy && intent === "NEED_TIME") return "UNDECIDED";

  // Remaining combinations are the Q1/Q3 conflicts:
  // happy + NO, or NOT_GOOD + ENROLL.
  return "UNDECIDED";
}

/** Whether the survey should ask for the optional reason chip. */
export function surveyNeedsReason(
  overall: DemoRatingValue | null,
  intent: DemoIntentValue | null,
): boolean {
  return overall === "NOT_GOOD" || intent === "NO";
}

export function isDemoRating(v: unknown): v is DemoRatingValue {
  return typeof v === "string" && (DEMO_RATINGS as readonly string[]).includes(v);
}
export function isDemoFit(v: unknown): v is DemoFitValue {
  return typeof v === "string" && (DEMO_FITS as readonly string[]).includes(v);
}
export function isDemoIntent(v: unknown): v is DemoIntentValue {
  return typeof v === "string" && (DEMO_INTENTS as readonly string[]).includes(v);
}
export function isDemoReason(v: unknown): v is DemoReasonValue {
  return typeof v === "string" && (DEMO_REASONS as readonly string[]).includes(v);
}
