import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

/**
 * Expands each Enrollment's recurring weekly schedule
 * (`scheduleDays`/`scheduleTime`) into actual dated occurrences
 * within a requested month — there's no `ClassSession` table yet
 * (03-DATA-MODEL.md), so "what's on the calendar" is computed on
 * the fly from the Enrollment's cycle rather than read from stored
 * rows. Shared between the Parent calendar (`/api/parent/calendar`,
 * one child or all children) and the Teacher calendar
 * (`/api/teacher/calendar`, every student) — same expansion logic,
 * just a different `where` clause, same pattern as
 * `enrollmentApproval.service.ts`.
 *
 * Only `ACTIVE`/`LAPSED` enrollments are shown — those are the only
 * statuses where both approvals are done and a schedule was
 * actually agreed on (see `EnrollmentStatus`'s doc-comment: "ACTIVE
 * — lectures can be scheduled"). Enrollments still pending
 * Teacher/Parent/Admin approval don't have a confirmed schedule yet.
 */
const CALENDAR_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
];

export interface CalendarOccurrence {
  date: string; // YYYY-MM-DD, local calendar date
  time: string | null; // "HH:mm", null if scheduleTime was never set
  enrollmentId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
}

const calendarInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: { select: { id: true, courseTitle: true, subject: true } },
} as const;

type EnrollmentWithRelations = Awaited<
  ReturnType<typeof prisma.enrollment.findMany<{ include: typeof calendarInclude }>>
>[number];

/** Parses "YYYY-MM" (defaults to the current month) into a [start, end) range. */
function resolveMonthRange(monthParam?: string) {
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();

  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid month — expected YYYY-MM.");
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);

  return { start, end };
}

function displayName(p: {
  firstName: string;
  lastName?: string;
  visibleName: string | null;
}) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName ?? ""}`.trim();
}

function expandEnrollment(
  enrollment: EnrollmentWithRelations,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOccurrence[] {
  if (!enrollment.scheduleDays?.length) {
    return [];
  }

  const cycleStart = new Date(enrollment.cycleStartDate);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + enrollment.noOfMonths);

  const from = cycleStart > rangeStart ? cycleStart : rangeStart;
  const to = cycleEnd < rangeEnd ? cycleEnd : rangeEnd;

  if (from >= to) {
    return [];
  }

  const daySet = new Set(enrollment.scheduleDays);
  const occurrences: CalendarOccurrence[] = [];

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (cursor < to) {
    if (daySet.has(cursor.getDay())) {
      occurrences.push({
        date: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
        time: enrollment.scheduleTime,
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        studentName: displayName(enrollment.student),
        teacherId: enrollment.teacher.id,
        teacherName: displayName(enrollment.teacher),
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.courseTitle,
        subject: enrollment.course.subject ?? enrollment.subject ?? null,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
}

/**
 * A Parent's calendar. `studentId` optionally scopes to one child's
 * profile page — omitted, this returns every child's schedule
 * (each occurrence still carries `studentId`/`studentName` so the
 * client can color-code per child).
 */
export async function getParentCalendarOccurrences(
  parentId: string,
  monthParam?: string,
  studentId?: string,
) {
  const { start, end } = resolveMonthRange(monthParam);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      parentId,
      status: { in: CALENDAR_STATUSES },
      ...(studentId ? { studentId } : {}),
    },
    include: calendarInclude,
  });

  return enrollments.flatMap((e) => expandEnrollment(e, start, end));
}

/** A Teacher's calendar — every scheduled class, across every enrolled student. */
export async function getTeacherCalendarOccurrences(
  teacherId: string,
  monthParam?: string,
) {
  const { start, end } = resolveMonthRange(monthParam);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      teacherId,
      status: { in: CALENDAR_STATUSES },
    },
    include: calendarInclude,
  });

  return enrollments.flatMap((e) => expandEnrollment(e, start, end));
}
