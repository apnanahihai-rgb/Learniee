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
  /** Group only: price for one cycle (month). */
  groupPricePerCycle: string;
  /** Group only: weekly class days, 0 = Sunday. */
  groupDays: number[];
  /** Group only: "HH:mm" (IST). */
  groupTime: string;
  /** Group only: "TIME_BOUND" | "OPEN" ("" until chosen). */
  groupMode: "" | "TIME_BOUND" | "OPEN";
  /** Group only: how parents may join — "MONTHLY_FIXED" | "ANYTIME" ("" until chosen). */
  groupJoinMode: "" | "MONTHLY_FIXED" | "ANYTIME";
  /** Group only, time-bound: "YYYY-MM-DD". */
  groupStartDate: string;
  groupEndDate: string;
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
  groupPricePerCycle: "",
  groupDays: [],
  groupTime: "",
  groupMode: "",
  groupJoinMode: "",
  groupStartDate: "",
  groupEndDate: "",
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
