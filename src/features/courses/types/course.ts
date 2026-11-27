export interface CourseFormData {
  category: string;
  timeSlot: string;

  subject: string;
  /** Final stored value, derived from gradeMode/gradeFrom/gradeTo by the form. */
  grade: string;
  gradeMode: "single" | "range";
  gradeFrom: string;
  gradeTo: string;
  /** Free text, used when `subject` is "Other". */
  subjectOther: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  /** Free text, used when `language` is "Other". */
  languageOther: string;
  frequency: string;
  /** Used when `frequency` is "Custom". */
  frequencyCustom: string;

  courseTitle: string;
  objective: string;
  description: string;

  modules: string;
  /** Number of modules, used when `modules` is "Custom". */
  moduleCustom: string;
  courseTags: string;
  price: string;
  isIITian: boolean;

  certificateEnabled: boolean;
  certificateSessionThreshold: string;

  /** Only used when `type` is "Group". */
  groupMaxStudents: string;
  /** Group only: weekly class days, 0 = Sunday. */
  groupDays: number[];
  /** Group only: "HH:mm" (IST). */
  groupTime: string;
  /** Group only: "ONE_TIME" | "RECURRING" ("" until chosen). */
  groupKind: "" | "ONE_TIME" | "RECURRING";
  /** Group only, recurring: "WEEKLY" | "MONTHLY". */
  groupRecurrence: "" | "WEEKLY" | "MONTHLY";
  /** Group only, one-time: may parents join after it has started? */
  groupAllowMidwayJoin: "" | "YES" | "NO";
  /** Group only, one-time: class period "YYYY-MM-DD". */
  groupStartDate: string;
  groupEndDate: string;
  /** Group only: registration window "YYYY-MM-DD" (end is optional for recurring). */
  groupRegStartDate: string;
  groupRegEndDate: string;
  /** Group only: student age range. */
  groupAgeMin: string;
  groupAgeMax: string;
  /** Group only: the Teacher accepted the notices. */
  groupTermsAccepted: boolean;
}

export const initialCourseFormData: CourseFormData = {
  category: "",
  timeSlot: "",

  subject: "",
  grade: "",
  gradeMode: "single",
  gradeFrom: "",
  gradeTo: "",
  subjectOther: "",
  board: "",
  experience: "",

  duration: "",
  type: "",
  language: "",
  languageOther: "",
  frequency: "",
  frequencyCustom: "",

  courseTitle: "",
  objective: "",
  description: "",

  modules: "",
  moduleCustom: "",
  courseTags: "",
  price: "",
  isIITian: false,

  certificateEnabled: false,
  certificateSessionThreshold: "",

  groupMaxStudents: "",
  groupDays: [],
  groupTime: "",
  groupKind: "",
  groupRecurrence: "",
  groupAllowMidwayJoin: "",
  groupStartDate: "",
  groupEndDate: "",
  groupRegStartDate: "",
  groupRegEndDate: "",
  groupAgeMin: "",
  groupAgeMax: "",
  groupTermsAccepted: false,
};

/**
 * Shape used by CourseCard (Teacher's own course list) — a subset of
 * the full Course record returned by GET /api/teacher/course.
 */
export interface TeacherCourseSummary {
  id: string;
  courseTitle: string | null;
  subject: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;
  groupMaxStudents?: number | null;
  groupPricePerCycle?: string | null;
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupJoinMode?: string | null;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  price: string | null;
  thumbnailKey: string | null;
  introVideoKey: string | null;
  createdAt: string;
}
