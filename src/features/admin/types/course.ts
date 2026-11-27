export interface AdminCourse {
  id: string;
  teacherId: string;

  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  category: string | null;
  timeSlot: string | null;

  subject: string | null;
  grade: string | null;
  board: string | null;
  experience: string | null;

  duration: string | null;
  type: string | null;
  groupMaxStudents: number | null;
  groupPricePerCycle: string | null;
  groupDays: number[];
  groupTime: string | null;
  groupMode: "TIME_BOUND" | "OPEN" | null;
  groupJoinMode: "MONTHLY_FIXED" | "ANYTIME" | null;
  groupStartDate: string | null;
  groupEndDate: string | null;
  language: string | null;
  frequency: string | null;

  courseTitle: string | null;
  rating: number | null;
  objective: string | null;
  description: string | null;

  modules: string | null;
  courseTags: string | null;
  price: string | null;
  isIITian: boolean;
  standardPrice: string | null;
  isPriceCustomized: boolean;

  thumbnailUrl: string | null;

  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "INACTIVE";

  createdAt: string;
}
