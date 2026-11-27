import "server-only";

import { ClassSessionStatus, EnrollmentStatus } from "@prisma/client";

import { isGroupType } from "@/features/courses/utils/groupClass";
import { prisma } from "@/lib/prisma";

/**
 * Group classes (Nov 2026) — class day and shared work.
 *
 * A group is a Course whose `type` is "Group"; every student holds their own
 * paid Enrollment, so every student also has their own `ClassSession` rows.
 * Two sessions are "the same group class" when they belong to the same course
 * and start at the same instant. Nothing new is stored for that: the group is
 * found by this rule every time, so the money, outcome and payout rules that
 * work per Enrollment stay exactly as they are.
 *
 * Shared work (Homework, Resources, chat) is fanned out as one row per
 * student's Enrollment — see `listGroupMateEnrollments`.
 */

/** The bits of a session needed to tell whether it belongs to a group class. */
export interface GroupSessionRef {
  id: string;
  startsAt: Date | null;
  enrollment: { courseId: string; course: { type: string | null } };
}

export interface GroupSibling {
  id: string;
  status: ClassSessionStatus;
  studentJoinedAt: Date | null;
  teacherStartedAt: Date | null;
  teacherEndedAt: Date | null;
}

/** True when the session belongs to a group course. No query. */
export function isGroupSession(session: GroupSessionRef): boolean {
  return isGroupType(session.enrollment.course.type) && session.startsAt !== null;
}

/**
 * The OTHER students' sessions of the same group class (same course, same
 * start). Empty for an Individual class. Cancelled / excused sessions are left
 * out: that student isn't in the room.
 */
export async function findGroupSiblings(session: GroupSessionRef): Promise<GroupSibling[]> {
  if (!isGroupSession(session)) return [];

  return prisma.classSession.findMany({
    where: {
      id: { not: session.id },
      startsAt: session.startsAt,
      enrollment: { courseId: session.enrollment.courseId },
      status: ClassSessionStatus.SCHEDULED,
    },
    select: {
      id: true,
      status: true,
      studentJoinedAt: true,
      teacherStartedAt: true,
      teacherEndedAt: true,
    },
  });
}

/**
 * How many students are in this group class and how many have joined.
 * Counts every student session of the class except cancelled / excused ones.
 */
export async function countGroupClassStudents(
  session: GroupSessionRef,
): Promise<{ size: number; joined: number } | null> {
  if (!isGroupSession(session)) return null;

  const rows = await prisma.classSession.findMany({
    where: {
      startsAt: session.startsAt,
      enrollment: { courseId: session.enrollment.courseId },
      status: {
        notIn: [
          ClassSessionStatus.CANCELLED,
          ClassSessionStatus.CANCELLED_LATE,
          ClassSessionStatus.EXCUSED,
        ],
      },
    },
    select: { studentJoinedAt: true },
  });

  return {
    size: rows.length,
    joined: rows.filter((row) => row.studentJoinedAt !== null).length,
  };
}

export interface GroupMateEnrollment {
  id: string;
  teacherId: string;
  parentId: string;
  studentId: string;
  status: EnrollmentStatus;
}

/**
 * Every enrollment in the same group as `enrollmentId` whose status is in
 * `statuses` — the one passed in included. Empty when the enrollment's course
 * isn't a group course (callers then treat it as a single enrollment).
 */
export async function listGroupMateEnrollments(
  enrollmentId: string,
  statuses: ReadonlySet<string>,
): Promise<GroupMateEnrollment[]> {
  const own = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, course: { select: { type: true } } },
  });

  if (!own || !isGroupType(own.course.type)) return [];

  return prisma.enrollment.findMany({
    where: { courseId: own.courseId, status: { in: [...statuses] as EnrollmentStatus[] } },
    select: { id: true, teacherId: true, parentId: true, studentId: true, status: true },
  });
}
