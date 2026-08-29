/**
 * Same field set as onboarding's Child Information step
 * (src/app/parent/onboarding/step2/page.tsx) - intentionally kept
 * in sync with that flow so "add another student" always asks for
 * exactly what the first one asked for at signup.
 */
export interface StudentFormData {
  firstName: string;
  lastName: string;
  visibleName: string;
  gender: string;
  age: string;
  standard: string;
  board: string;
  currentSchoolName: string;
  learningDifficulties: string;
}

export const initialStudentFormData: StudentFormData = {
  firstName: "",
  lastName: "",
  visibleName: "",
  gender: "",
  age: "",
  standard: "",
  board: "",
  currentSchoolName: "",
  learningDifficulties: "",
};

/** Options for the Gender select in StudentForm. */
export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

/**
 * Common Indian schooling boards for the Board select in
 * StudentForm. "Other" reveals a free-text field so this never
 * blocks a parent whose board isn't listed here.
 */
export const BOARD_OPTIONS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];
export const BOARD_OTHER = "Other";

/**
 * A single Student profile as returned by GET /api/parent/students.
 * `photoViewUrl` is a freshly-issued short-lived presigned S3 GET
 * URL (the bucket is fully private) - never cache it long-term.
 */
export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
  gender: string | null;
  age: number | null;
  standard: string | null;
  board: string | null;
  currentSchoolName: string | null;
  learningDifficulties: string | null;
  photoViewUrl: string | null;
  createdAt: string;
}
