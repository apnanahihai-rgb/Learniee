import { EnrollmentStatus } from "@prisma/client";
import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Group classes (Nov 2026) — a group is a Course whose `type` is "Group".
 * A student is "in the group" while they hold a paid Enrollment on that
 * course, so there is no separate membership table: seats = enrollments.
 *
 * These statuses hold a seat. REJECTED / CANCELLED / LAPSED / COMPLETED free it.
 */
export const SEAT_HOLDING_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_APPROVAL,
  EnrollmentStatus.APPROVED,
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  EnrollmentStatus.PENDING_ADMIN_APPROVAL,
];

/** How many seats of a group course are taken right now. */
export function countGroupSeats(courseId: string): Promise<number> {
  return prisma.enrollment.count({
    where: { courseId, status: { in: SEAT_HOLDING_STATUSES } },
  });
}

/** True when this student already holds a seat in the group. */
export async function isStudentInGroup(
  courseId: string,
  studentId: string,
): Promise<boolean> {
  const found = await prisma.enrollment.findFirst({
    where: { courseId, studentId, status: { in: SEAT_HOLDING_STATUSES } },
    select: { id: true },
  });

  return found !== null;
}
