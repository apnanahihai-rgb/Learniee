import { prisma } from "@/lib/prisma";
import { HomeworkSubmissionStatus } from "@prisma/client";

import { ACTIVE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";

/**
 * Homework module (added Sep 4, 2026) — deliberately a simple
 * "assign once, submit once" flow scoped to one Enrollment, not a
 * general LMS (Google Classroom was the reference, kept much
 * simpler per direct instruction). Shared between the Teacher and
 * Parent routes, same reasoning as enrollmentApproval.service.ts —
 * both roles act on the same underlying rows.
 *
 * Unlocked only once the Enrollment has actually cleared dual
 * approval (ACTIVE/LAPSED) — see ACTIVE_ENROLLMENT_STATUSES. A
 * PENDING_* or REJECTED/CANCELLED enrollment has no homework access
 * at all, on either side.
 */

export class HomeworkError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const homeworkInclude = {
  submission: true,
} as const;

/**
 * Loads the Enrollment and checks:
 *   1. it exists and belongs to this actor (teacher or parent)
 *   2. it's actually ACTIVE/LAPSED — homework is unlocked only once
 *      dual-approval has finished, same gate cycleProgress.service.ts
 *      uses for "mark session complete".
 * Throws HomeworkError otherwise. Returns the enrollment row (with
 * the ids needed to denormalize onto a new Homework row).
 */
async function requireActiveEnrollment(
  enrollmentId: string,
  actor: { role: "TEACHER"; teacherId: string } | { role: "PARENT"; parentId: string },
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      status: true,
      teacherId: true,
      parentId: true,
      studentId: true,
    },
  });

  if (!enrollment) {
    throw new HomeworkError("Enrollment not found.", 404);
  }

  const ownerId = actor.role === "TEACHER" ? enrollment.teacherId : enrollment.parentId;
  const actorId = actor.role === "TEACHER" ? actor.teacherId : actor.parentId;

  if (ownerId !== actorId) {
    throw new HomeworkError("This enrollment doesn't belong to your account.", 403);
  }

  if (!ACTIVE_ENROLLMENT_STATUSES.has(enrollment.status)) {
    throw new HomeworkError(
      "Homework unlocks once this enrollment is fully approved and active.",
      409,
    );
  }

  return enrollment;
}

/** Every homework assignment for an enrollment, newest first. Used by both roles once ownership is checked. */
export function listHomeworkForEnrollment(enrollmentId: string) {
  return prisma.homework.findMany({
    where: { enrollmentId },
    include: homeworkInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listHomeworkForTeacherEnrollment(
  enrollmentId: string,
  teacherId: string,
) {
  await requireActiveEnrollment(enrollmentId, { role: "TEACHER", teacherId });
  return listHomeworkForEnrollment(enrollmentId);
}

export async function listHomeworkForParentEnrollment(
  enrollmentId: string,
  parentId: string,
) {
  await requireActiveEnrollment(enrollmentId, { role: "PARENT", parentId });
  return listHomeworkForEnrollment(enrollmentId);
}

export interface CreateHomeworkInput {
  enrollmentId: string;
  title: string;
  instructions?: string;
  attachmentKey?: string;
  dueDate?: string;
}

/** Teacher assigns new homework on an active enrollment. */
export async function createHomework(teacherId: string, input: CreateHomeworkInput) {
  const title = input.title?.trim();

  if (!title) {
    throw new HomeworkError("Title is required.");
  }

  const enrollment = await requireActiveEnrollment(input.enrollmentId, {
    role: "TEACHER",
    teacherId,
  });

  return prisma.homework.create({
    data: {
      enrollmentId: enrollment.id,
      teacherId: enrollment.teacherId,
      parentId: enrollment.parentId,
      studentId: enrollment.studentId,
      title,
      instructions: input.instructions?.trim() || null,
      attachmentKey: input.attachmentKey || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
    include: homeworkInclude,
  });
}

async function requireOwnedHomework(homeworkId: string, teacherId: string) {
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, teacherId },
  });

  if (!homework) {
    throw new HomeworkError("Homework not found, or doesn't belong to you.", 404);
  }

  return homework;
}

export interface UpdateHomeworkInput {
  title?: string;
  instructions?: string;
  attachmentKey?: string | null;
  dueDate?: string | null;
}

/** Teacher edits their own homework (title/instructions/attachment/due date). */
export async function updateHomework(
  teacherId: string,
  homeworkId: string,
  input: UpdateHomeworkInput,
) {
  const homework = await requireOwnedHomework(homeworkId, teacherId);

  if (input.title !== undefined && !input.title.trim()) {
    throw new HomeworkError("Title can't be empty.");
  }

  return prisma.homework.update({
    where: { id: homework.id },
    data: {
      title: input.title !== undefined ? input.title.trim() : undefined,
      instructions:
        input.instructions !== undefined ? input.instructions.trim() || null : undefined,
      attachmentKey: input.attachmentKey !== undefined ? input.attachmentKey : undefined,
      dueDate:
        input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
    },
    include: homeworkInclude,
  });
}

/** Teacher deletes their own homework (submission cascades with it). */
export async function deleteHomework(teacherId: string, homeworkId: string) {
  const homework = await requireOwnedHomework(homeworkId, teacherId);
  await prisma.homework.delete({ where: { id: homework.id } });
}

export interface SubmitHomeworkInput {
  fileKey: string;
  note?: string;
}

/**
 * Parent (on the Student's behalf) submits — or resubmits, this is
 * an upsert — their work for one Homework row. Resubmitting always
 * resets status back to SUBMITTED, clearing any prior feedback/
 * review timestamp, so the Teacher knows there's new work to look
 * at.
 */
export async function submitHomework(
  parentId: string,
  homeworkId: string,
  input: SubmitHomeworkInput,
) {
  if (!input.fileKey) {
    throw new HomeworkError("A submission file is required.");
  }

  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, parentId },
  });

  if (!homework) {
    throw new HomeworkError("Homework not found, or doesn't belong to your account.", 404);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: homework.enrollmentId },
    select: { status: true },
  });

  if (!enrollment || !ACTIVE_ENROLLMENT_STATUSES.has(enrollment.status)) {
    throw new HomeworkError(
      "This enrollment is no longer active — you can't submit homework here.",
      409,
    );
  }

  return prisma.homeworkSubmission.upsert({
    where: { homeworkId },
    create: {
      homeworkId,
      fileKey: input.fileKey,
      note: input.note?.trim() || null,
    },
    update: {
      fileKey: input.fileKey,
      note: input.note?.trim() || null,
      status: HomeworkSubmissionStatus.SUBMITTED,
      feedback: null,
      reviewedAt: null,
      submittedAt: new Date(),
    },
  });
}

export interface ReviewSubmissionInput {
  feedback?: string;
}

/** Teacher marks a submission reviewed, optionally leaving short feedback text. */
export async function reviewSubmission(
  teacherId: string,
  homeworkId: string,
  input: ReviewSubmissionInput,
) {
  const homework = await requireOwnedHomework(homeworkId, teacherId);

  const submission = await prisma.homeworkSubmission.findUnique({
    where: { homeworkId: homework.id },
  });

  if (!submission) {
    throw new HomeworkError("No submission to review yet.", 404);
  }

  return prisma.homeworkSubmission.update({
    where: { homeworkId: homework.id },
    data: {
      status: HomeworkSubmissionStatus.REVIEWED,
      feedback: input.feedback?.trim() || null,
      reviewedAt: new Date(),
    },
  });
}
