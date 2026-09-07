/** Shape returned by /api/parent/calendar and /api/teacher/calendar (see scheduleOccurrences.service.ts). */
export interface CalendarOccurrence {
  /** The underlying ClassSession id — used to link to the Join/Start-session flow. */
  id: string;
  date: string;
  time: string | null;
  /** ClassSessionStatus — SCHEDULED/COMPLETED/CANCELLED/MISSED. */
  status: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
}
