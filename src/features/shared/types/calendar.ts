/** Shape returned by /api/parent/calendar and /api/teacher/calendar (see scheduleOccurrences.service.ts). */
export interface CalendarOccurrence {
  date: string;
  time: string | null;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
}
