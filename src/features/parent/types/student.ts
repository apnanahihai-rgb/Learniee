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

/**
 * Ordered [field name, label] pairs used to render the form and to
 * keep onboarding Step 2 and this "add student" form from silently
 * drifting apart if a field is ever added or renamed.
 */
export const STUDENT_FORM_FIELDS: Array<{
  name: keyof StudentFormData;
  label: string;
  required?: boolean;
}> = [
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "visibleName", label: "Display name" },
  { name: "gender", label: "Gender" },
  { name: "age", label: "Age" },
  { name: "standard", label: "Standard / Grade" },
  { name: "board", label: "Board" },
  { name: "currentSchoolName", label: "Current school name" },
  { name: "learningDifficulties", label: "Learning difficulties (if any)" },
];

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
