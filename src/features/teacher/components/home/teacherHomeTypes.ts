import type { DemoJoinWindowDto } from "@/features/shared/components/DemoJoinButton";
import type { AttentionItem } from "@/features/parent/components/home/homeLogic";

export interface TeacherHomeSession {
  id: string;
  kind: "class" | "demo";
  /** Course title ("Demo: …" for a demo). */
  title: string;
  studentName: string;
  courseId: string | null;
  subject: string | null;
  start: Date;
  end: Date;
  /** Class start page, or the Demo page. */
  href: string;
  /** Demo only — what DemoJoinButton needs. */
  demo?: { bookingId: string; joinWindow: DemoJoinWindowDto | undefined };
}

export interface TeacherHomeCourse {
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

export interface TeacherHomeEarningRow {
  id: string;
  name: string;
  cycle: number;
  processing: boolean;
  amount: number;
}

export interface TeacherHomeEarnings {
  paid: number;
  onTheWay: number;
  rows: TeacherHomeEarningRow[];
}

export interface TeacherHomeSetup {
  href: string;
  done: number;
  total: number;
  nextLabel: string;
}

export interface TeacherHomeData {
  firstName: string;
  sessions: TeacherHomeSession[];
  courses: TeacherHomeCourse[];
  /** Distinct student names, in a stable order — drives the per-student colour. */
  studentNames: string[];
  activeStudentCount: number;
  reviewCount: number;
  attention: AttentionItem[];
  earnings: TeacherHomeEarnings;
  setup: TeacherHomeSetup | null;
  meetEnabled: boolean;
}
