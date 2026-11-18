import type { AttentionItem } from "@/features/parent/components/home/homeLogic";
import type { DemoJoinWindowDto } from "@/features/shared/components/DemoJoinButton";

/**
 * JSON shape of `GET /api/teacher/home` — everything the Teacher Home screen
 * shows, in one response. Dates are ISO strings; `useTeacherHome` turns them
 * into `Date`s for the components.
 */

export interface TeacherHomeSessionDto {
  id: string;
  kind: "class" | "demo";
  /** Course title ("Demo: …" for a demo). */
  title: string;
  studentName: string;
  courseId: string | null;
  subject: string | null;
  startsAt: string;
  endsAt: string;
  /** Class start page, or the Demo page. */
  href: string;
  /** Demo only — what DemoJoinButton needs. */
  demo?: { bookingId: string; joinWindow: DemoJoinWindowDto };
}

export interface TeacherHomeCourseDto {
  id: string;
  title: string;
  subject: string | null;
  grade: string | null;
  price: number | null;
  approved: boolean;
  activeStudents: number;
  /** Average cycle progress of the course's active students, 0–100. */
  progress: number;
}

export interface TeacherHomeEarningRowDto {
  id: string;
  name: string;
  cycle: number;
  processing: boolean;
  amount: number;
}

export interface TeacherHomeDto {
  serverNow: string;
  meetEnabled: boolean;
  firstName: string;
  sessions: TeacherHomeSessionDto[];
  courses: TeacherHomeCourseDto[];
  /** Distinct student names, stable order — drives the per-student colour. */
  studentNames: string[];
  activeStudentCount: number;
  /** Enrollments waiting for this teacher's review. */
  reviewCount: number;
  attention: AttentionItem[];
  earnings: {
    paid: number;
    onTheWay: number;
    rows: TeacherHomeEarningRowDto[];
  };
  /** Null when every setup step is done. */
  setup: { href: string; done: number; total: number; nextLabel: string } | null;
}
