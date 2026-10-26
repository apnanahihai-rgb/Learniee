import "server-only";

import { prisma } from "@/lib/prisma";
import { adminDeleteCognitoUser } from "@/lib/cognitoAdmin";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { createNotification } from "@/features/shared/server/notification.service";
import { DELETE_REASON_MAX, DELETE_REASON_MIN } from "@/features/admin/config/ratingBoard";
import {
  LIVE_ENROLLMENT_STATUSES,
  OPEN_LEDGER_STATUSES,
} from "@/features/admin/server/ratingBoard.service";

export class RatingRemovalError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface RemovalAdmin {
  sub: string;
  name?: string;
  email?: string;
}

function cleanReason(reason: unknown): string {
  const text = typeof reason === "string" ? reason.trim() : "";

  if (text.length < DELETE_REASON_MIN || text.length > DELETE_REASON_MAX) {
    throw new RatingRemovalError(
      `A reason of ${DELETE_REASON_MIN} to ${DELETE_REASON_MAX} characters is required.`,
      400,
    );
  }

  return text;
}

/**
 * Admin deletes one course. Refused while a parent still has a live
 * enrollment in it or a payout for it is unfinished. Everything else
 * hanging off the course (ended enrollments, sessions, reviews, payout
 * history, certificates) is removed with it, so the dialog warns about that.
 */
export async function deleteCourseAsAdmin(input: { courseId: string; reason: unknown; admin: RemovalAdmin }) {
  const reason = cleanReason(input.reason);

  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, courseTitle: true, teacherId: true },
  });

  if (!course) throw new RatingRemovalError("Course not found.", 404);

  const [live, openPayouts] = await Promise.all([
    prisma.enrollment.count({ where: { courseId: course.id, status: { in: LIVE_ENROLLMENT_STATUSES } } }),
    prisma.tuitionLedgerEntry.count({ where: { courseId: course.id, payoutStatus: { in: OPEN_LEDGER_STATUSES } } }),
  ]);

  if (live > 0) {
    throw new RatingRemovalError(
      `This course still has ${live} live enrollment${live === 1 ? "" : "s"}. Cancel or finish them first.`,
      409,
    );
  }

  if (openPayouts > 0) {
    throw new RatingRemovalError(
      `This course has ${openPayouts} unfinished teacher payout${openPayouts === 1 ? "" : "s"}. Settle them first.`,
      409,
    );
  }

  await prisma.course.delete({ where: { id: course.id } });

  const title = course.courseTitle?.trim() || "Untitled course";

  await logActivity({
    action: "COURSE_DELETED",
    actorRole: "ADMIN",
    actorId: input.admin.sub,
    actorName: input.admin.name,
    actorEmail: input.admin.email,
    description: `Course "${title}" deleted by Admin. Reason: ${reason}`,
    metadata: { courseId: course.id, teacherId: course.teacherId, title, reason },
  });

  // Best effort: telling the teacher must never undo the delete.
  try {
    await createNotification({
      recipientId: course.teacherId,
      recipientRole: "TEACHER",
      type: "GENERIC",
      title: "Course removed",
      message: `Your course "${title}" was removed by Admin. Reason: ${reason}`,
      link: "/teacher/course-management",
    });
  } catch (err) {
    console.error("Course delete notification failed:", err);
  }
}

/**
 * Admin deletes a teacher account (database rows first, then the Cognito
 * login). Refused while the teacher has live enrollments or unfinished
 * payouts. Their courses, reviews, sessions and files go with them.
 */
export async function deleteTeacherAsAdmin(input: { teacherId: string; reason: unknown; admin: RemovalAdmin }) {
  const reason = cleanReason(input.reason);

  const teacher = await prisma.teacher.findUnique({
    where: { id: input.teacherId },
    select: { id: true, email: true, cognitoId: true, firstName: true, lastName: true },
  });

  if (!teacher) throw new RatingRemovalError("Teacher not found.", 404);

  const [live, openPayouts] = await Promise.all([
    prisma.enrollment.count({ where: { teacherId: teacher.id, status: { in: LIVE_ENROLLMENT_STATUSES } } }),
    prisma.tuitionLedgerEntry.count({ where: { teacherId: teacher.id, payoutStatus: { in: OPEN_LEDGER_STATUSES } } }),
  ]);

  if (live > 0) {
    throw new RatingRemovalError(
      `This teacher still has ${live} live enrollment${live === 1 ? "" : "s"}. Cancel or finish them first.`,
      409,
    );
  }

  if (openPayouts > 0) {
    throw new RatingRemovalError(
      `This teacher has ${openPayouts} unfinished payout${openPayouts === 1 ? "" : "s"}. Settle them first.`,
      409,
    );
  }

  await prisma.teacher.delete({ where: { id: teacher.id } });

  // The database row is already gone. If the login can't be removed, say so
  // instead of failing: the teacher can no longer use the app either way.
  let loginRemoved = true;

  try {
    await adminDeleteCognitoUser(teacher.cognitoId);
  } catch (err) {
    loginRemoved = false;
    console.error("Cognito delete failed after teacher delete:", err);
  }

  const name = `${teacher.firstName} ${teacher.lastName}`.trim();

  await logActivity({
    action: "USER_DELETED",
    actorRole: "ADMIN",
    actorId: input.admin.sub,
    actorName: input.admin.name,
    actorEmail: input.admin.email,
    description: `Teacher account deleted — ${name} (${teacher.email}). Reason: ${reason}`,
    metadata: { deletedEmail: teacher.email, deletedRole: "teacher", reason, loginRemoved },
  });

  return { loginRemoved };
}
