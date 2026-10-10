import "server-only";

import { logActivity } from "@/features/shared/server/activityLog.service";
import { prisma } from "@/lib/prisma";

/**
 * Teacher strikes (Part 1C): a simple per-teacher record, written
 * once per lost class by `sessionFollowUp.service.ts` (teacher
 * no-show, teacher cancellation, and — Phase 2.4 — a reschedule asked
 * for under 4 hours before the class). This file is the read side for
 * Admin, plus the Admin waiver (Phase 2.6). Nothing acts on the count
 * yet; a waived strike stays on the record but is not counted.
 */

export interface TeacherStrikeRow {
  id: string;
  teacherId: string;
  teacherName: string;
  reason: "TEACHER_NO_SHOW" | "TEACHER_CANCELLED";
  courseTitle: string | null;
  /** The class the strike is for. */
  classStartsAt: string | null;
  recordedAt: string;
  /** Phase 2.6: null while the strike counts. */
  waivedAt: string | null;
  waivedByName: string | null;
  waiveReason: string | null;
}

export class TeacherStrikeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const WAIVE_REASON_MIN_LENGTH = 5;
export const WAIVE_REASON_MAX_LENGTH = 500;

const MAX_ROWS = 200;

/** Newest first; pass a teacherId to see one teacher's strikes. */
export async function listTeacherStrikes(teacherId?: string): Promise<TeacherStrikeRow[]> {
  const rows = await prisma.teacherStrike.findMany({
    where: teacherId ? { teacherId } : {},
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: {
      id: true,
      teacherId: true,
      reason: true,
      createdAt: true,
      waivedAt: true,
      waivedByName: true,
      waiveReason: true,
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      classSession: {
        select: {
          startsAt: true,
          scheduledDate: true,
          enrollment: { select: { course: { select: { courseTitle: true } } } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    teacherName:
      row.teacher.visibleName?.trim() ||
      `${row.teacher.firstName} ${row.teacher.lastName}`.trim(),
    reason: row.reason,
    courseTitle: row.classSession.enrollment.course.courseTitle ?? null,
    classStartsAt: (row.classSession.startsAt ?? row.classSession.scheduledDate).toISOString(),
    recordedAt: row.createdAt.toISOString(),
    waivedAt: row.waivedAt?.toISOString() ?? null,
    waivedByName: row.waivedByName,
    waiveReason: row.waiveReason,
  }));
}

/**
 * Admin waives one strike (for example an emergency). A reason is
 * mandatory. The row is kept; it just stops counting. Waiving twice
 * is refused, and the guarded update means two Admins tapping at once
 * can't both succeed.
 */
export async function waiveTeacherStrike(input: {
  strikeId: string;
  reason: string;
  admin: { sub: string; name: string | null; email: string | null };
}): Promise<void> {
  const reason = input.reason.replace(/\r\n/g, "\n").trim();

  if (reason.length < WAIVE_REASON_MIN_LENGTH) {
    throw new TeacherStrikeError("Please give a short reason for waiving this strike.", 400);
  }

  if (reason.length > WAIVE_REASON_MAX_LENGTH) {
    throw new TeacherStrikeError(
      `Keep the reason under ${WAIVE_REASON_MAX_LENGTH} characters.`,
      400,
    );
  }

  const strike = await prisma.teacherStrike.findUnique({
    where: { id: input.strikeId },
    select: { id: true, teacherId: true, classSessionId: true, reason: true, waivedAt: true },
  });

  if (!strike) throw new TeacherStrikeError("Strike not found.", 404);
  if (strike.waivedAt) throw new TeacherStrikeError("This strike was already waived.", 409);

  const now = new Date();

  const result = await prisma.teacherStrike.updateMany({
    where: { id: strike.id, waivedAt: null },
    data: {
      waivedAt: now,
      waivedBySub: input.admin.sub,
      waivedByName: input.admin.name,
      waiveReason: reason,
    },
  });

  if (result.count === 0) {
    throw new TeacherStrikeError("This strike was already waived.", 409);
  }

  await logActivity({
    action: "TEACHER_STRIKE_WAIVED",
    actorRole: "ADMIN",
    actorId: input.admin.sub,
    actorName: input.admin.name,
    actorEmail: input.admin.email,
    description: `Admin waived a teacher strike (${strike.reason.toLowerCase().replace(/_/g, " ")}): ${reason}`,
    metadata: {
      strikeId: strike.id,
      teacherId: strike.teacherId,
      sessionId: strike.classSessionId,
      reason,
    },
  });
}
