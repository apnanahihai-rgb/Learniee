import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

/**
 * Sequential dual-approval workflow (resolves 06-OPEN-DECISIONS.md
 * #2, per direct clarification Sep 1, 2026):
 *
 *   PENDING_TEACHER_APPROVAL
 *     -> (Teacher approves as-is)        -> PENDING_ADMIN_APPROVAL
 *     -> (Teacher proposes a revision)   -> PENDING_PARENT_RECONFIRMATION
 *     -> (Teacher rejects)               -> REJECTED
 *
 *   PENDING_PARENT_RECONFIRMATION
 *     -> (Parent confirms the revision)  -> PENDING_ADMIN_APPROVAL
 *     -> (Parent declines)               -> CANCELLED
 *
 *   PENDING_ADMIN_APPROVAL
 *     -> (Admin approves)                -> ACTIVE
 *     -> (Admin rejects)                 -> REJECTED   (terminal — no bounce back to Teacher)
 *
 * The enrollment's ChatRoom is the sole Parent<->Teacher channel
 * throughout — any date/session discussion happens there, this
 * service only records the outcome (see `revisionNote`).
 */

export class EnrollmentApprovalError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const enrollmentListInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  parent: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: { select: { id: true, courseTitle: true, subject: true } },
  chatRoom: { select: { id: true } },
} as const;

/**
 * Enrollments this Teacher needs to see: still in the approval
 * queue, or already ACTIVE (added Sep 3, 2026 alongside cycle
 * progress — a Teacher needs to see ACTIVE enrollments to mark
 * sessions complete, not just pending ones).
 */
export function getEnrollmentsForTeacher(teacherId: string) {
  return prisma.enrollment.findMany({
    where: {
      teacherId,
      status: {
        in: [
          EnrollmentStatus.PENDING_TEACHER_APPROVAL,
          EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
          EnrollmentStatus.PENDING_ADMIN_APPROVAL,
          EnrollmentStatus.ACTIVE,
        ],
      },
    },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Enrollments waiting on Admin's review — the Admin action queue. */
export function getEnrollmentsForAdmin() {
  return prisma.enrollment.findMany({
    where: { status: EnrollmentStatus.PENDING_ADMIN_APPROVAL },
    include: enrollmentListInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function loadOwnedByTeacher(enrollmentId: string, teacherId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  return enrollment;
}

/** Teacher approves the enrollment exactly as the Parent paid for it. */
export async function teacherApproveEnrollment(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      teacherApprovedAt: new Date(),
      status: EnrollmentStatus.PENDING_ADMIN_APPROVAL,
    },
  });
}

export interface TeacherReviseInput {
  cycleStartDate?: string;
  sessionsPerMonth?: number;
  note: string;
}

/**
 * Teacher proposes a schedule/cycle change. `cycleStartDate` is
 * always safe to change (no cost impact — `dueDate` is simply
 * recalculated from it). `sessionsPerMonth` changes the price
 * (`monthlyRate`/`totalAmount`) — those are recalculated for the
 * record, but `amountPaid` (what Razorpay actually charged) is
 * NEVER touched here. If the new total no longer matches what was
 * paid, `pricingChangedAfterPayment` flips true so Admin sees a
 * clear flag instead of a silent mismatch — no automatic extra
 * charge or refund happens (that needs a manual/Razorpay-side
 * follow-up, out of scope here).
 */
export async function teacherReviseEnrollment(
  enrollmentId: string,
  teacherId: string,
  input: TeacherReviseInput,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on your review anymore.",
      409,
    );
  }

  if (!input.note?.trim()) {
    throw new EnrollmentApprovalError(
      "Add a short note explaining the change — the parent will see this.",
    );
  }

  const data: Record<string, unknown> = {
    revisedByTeacher: true,
    revisionNote: input.note.trim().slice(0, 1000),
    status: EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  };

  let cycleStartDate = enrollment.cycleStartDate;

  if (input.cycleStartDate) {
    const parsed = new Date(input.cycleStartDate);

    if (Number.isNaN(parsed.getTime())) {
      throw new EnrollmentApprovalError("That doesn't look like a valid date.");
    }

    cycleStartDate = parsed;
    const dueDate = new Date(parsed);
    dueDate.setMonth(dueDate.getMonth() + 1);

    data.cycleStartDate = cycleStartDate;
    data.dueDate = dueDate;
  }

  if (input.sessionsPerMonth) {
    if (
      !Number.isInteger(input.sessionsPerMonth) ||
      input.sessionsPerMonth < 4 ||
      input.sessionsPerMonth > 31
    ) {
      throw new EnrollmentApprovalError(
        "sessionsPerMonth must be a whole number between 4 and 31.",
      );
    }

    const monthlyRate = Number(enrollment.ratePerSession) * input.sessionsPerMonth;
    const totalAmount = monthlyRate * enrollment.noOfMonths;

    data.sessionsPerMonth = input.sessionsPerMonth;
    data.monthlyRate = monthlyRate;
    data.totalAmount = totalAmount;
    data.pricingChangedAfterPayment = totalAmount !== Number(enrollment.amountPaid);
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data,
  });
}

export async function teacherRejectEnrollment(
  enrollmentId: string,
  teacherId: string,
  reason: string,
) {
  const enrollment = await loadOwnedByTeacher(enrollmentId, teacherId);

  if (
    enrollment.status !== EnrollmentStatus.PENDING_TEACHER_APPROVAL &&
    enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION
  ) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on you anymore.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "TEACHER",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });
}

async function loadOwnedByParent(enrollmentId: string, parentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, parentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError(
      "Enrollment not found, or doesn't belong to your account.",
      404,
    );
  }

  return enrollment;
}

/** Parent accepts the Teacher's proposed revision — moves on to Admin. */
export async function parentConfirmRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to confirm on this enrollment.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      teacherApprovedAt: new Date(),
      status: EnrollmentStatus.PENDING_ADMIN_APPROVAL,
    },
  });
}

/** Parent declines the Teacher's proposed revision — enrollment is cancelled. */
export async function parentDeclineRevision(
  enrollmentId: string,
  parentId: string,
) {
  const enrollment = await loadOwnedByParent(enrollmentId, parentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) {
    throw new EnrollmentApprovalError(
      "There's no pending revision to decline on this enrollment.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.CANCELLED },
  });
}

async function loadPendingAdminReview(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throw new EnrollmentApprovalError("Enrollment not found.", 404);
  }

  return enrollment;
}

/** Admin approves — final step, enrollment goes ACTIVE and lectures can be scheduled. */
export async function adminApproveEnrollment(enrollmentId: string) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      adminApprovedAt: new Date(),
      status: EnrollmentStatus.ACTIVE,
    },
  });
}

/**
 * Admin rejects — terminal, per direct instruction. Does not bounce
 * back to the Teacher even though the Teacher already approved it.
 */
export async function adminRejectEnrollment(
  enrollmentId: string,
  reason: string,
) {
  const enrollment = await loadPendingAdminReview(enrollmentId);

  if (enrollment.status !== EnrollmentStatus.PENDING_ADMIN_APPROVAL) {
    throw new EnrollmentApprovalError(
      "This enrollment isn't waiting on admin approval.",
      409,
    );
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
      rejectedBy: "ADMIN",
      rejectionReason: reason?.trim().slice(0, 1000) || null,
    },
  });
}
