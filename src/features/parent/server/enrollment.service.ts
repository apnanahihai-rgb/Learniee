import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

/**
 * Cycle rule (updated Aug 31, 2026, per direct clarification —
 * supersedes 06-OPEN-DECISIONS.md #25's old fixed 4/8/12/24/30
 * set): minimum 4 sessions/month, any integer above that, capped at
 * 1 session/day for the longest possible month (31). Flagging that
 * 06-OPEN-DECISIONS.md #25 should be updated to match.
 */
const MIN_SESSIONS_PER_MONTH = 4;
const MAX_SESSIONS_PER_MONTH = 31;
const MAX_NO_OF_MONTHS = 12;

export class EnrollmentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CreateEnrollmentInput {
  studentId: string;
  teacherId: string;
  courseId: string;
  subject?: string | null;
  sessionsPerMonth: number;
  noOfMonths?: number;
  /**
   * ISO date string for when the cycle should start. Defaults to
   * today if omitted — most parents will just enroll "starting now".
   */
  cycleStartDate?: string;
}

/**
 * Creates a cycle-based Enrollment row with every field that's
 * knowable/calculable right now, ahead of Razorpay being wired in
 * (02-ARCHITECTURE.md). Nothing payment-specific (transaction date,
 * gateway ref) is captured here — that arrives later once a real
 * payment happens against this Enrollment.
 *
 * Pricing formula (flagged back in 06-OPEN-DECISIONS.md as an
 * assumption pending sign-off — see schema.prisma's Enrollment
 * doc-comment for the full reasoning):
 *   ratePerSession = Course.price
 *   monthlyRate    = ratePerSession * sessionsPerMonth
 *   totalAmount    = monthlyRate * noOfMonths
 *   dueDate        = cycleStartDate + 1 month
 *
 * Dual approval (Teacher + Admin, tiebreaker on disagreement) is
 * NOT built here — 06-OPEN-DECISIONS.md #2 is still open and
 * explicitly blocking. This only stores `status: PENDING_APPROVAL`
 * so the row exists for that workflow to act on once it's built.
 */
export async function createEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
) {
  if (
    !Number.isInteger(input.sessionsPerMonth) ||
    input.sessionsPerMonth < MIN_SESSIONS_PER_MONTH ||
    input.sessionsPerMonth > MAX_SESSIONS_PER_MONTH
  ) {
    throw new EnrollmentError(
      `sessionsPerMonth must be a whole number between ${MIN_SESSIONS_PER_MONTH} and ${MAX_SESSIONS_PER_MONTH}.`,
    );
  }

  const noOfMonths = input.noOfMonths ?? 1;

  if (!Number.isInteger(noOfMonths) || noOfMonths < 1 || noOfMonths > MAX_NO_OF_MONTHS) {
    throw new EnrollmentError(
      `noOfMonths must be a whole number between 1 and ${MAX_NO_OF_MONTHS}.`,
    );
  }

  // Same not-found-vs-not-yours guard used by
  // demoCoupon.service.ts / student.service.ts.
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      teacherId: input.teacherId,
      status: "APPROVED",
    },
    select: { id: true, subject: true, price: true },
  });

  if (!course) {
    throw new EnrollmentError(
      "Course not found, or isn't open for enrollment yet.",
      404,
    );
  }

  if (course.price == null) {
    throw new EnrollmentError(
      "This course doesn't have a rate set yet — ask the teacher to add one before enrolling.",
    );
  }

  const cycleStartDate = input.cycleStartDate
    ? new Date(input.cycleStartDate)
    : new Date();

  if (Number.isNaN(cycleStartDate.getTime())) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  const dueDate = new Date(cycleStartDate);
  dueDate.setMonth(dueDate.getMonth() + 1);

  const ratePerSession = Number(course.price);
  const monthlyRate = ratePerSession * input.sessionsPerMonth;
  const totalAmount = monthlyRate * noOfMonths;

  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: input.studentId,
      parentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject,
      sessionsPerMonth: input.sessionsPerMonth,
      noOfMonths,
      ratePerSession,
      monthlyRate,
      totalAmount,
      cycleStartDate,
      dueDate,
      status: EnrollmentStatus.PENDING_APPROVAL,
      // Every Enrollment gets exactly one ChatRoom, created in the
      // same write. Gating rationale (why this isn't restricted to
      // EnrollmentStatus.APPROVED) is documented on the ChatRoom
      // model in schema.prisma — short version: dual approval (#2)
      // isn't built yet, so nothing can reach APPROVED today.
      chatRoom: {
        create: {
          parentId,
          teacherId: input.teacherId,
          courseId: input.courseId,
          studentId: input.studentId,
        },
      },
    },
  });

  return enrollment;
}

/**
 * Lists every enrollment a parent has made, most recent first — for
 * a future "My enrollments"/Payments view. Also the shape Accounts'
 * Tuition Ledger will eventually read from (joined with
 * ParentProfile/Student/Teacher for the name fields, per
 * 03-DATA-MODEL.md's note that names aren't duplicated here).
 */
export async function getEnrollmentsForParent(parentId: string) {
  return prisma.enrollment.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { id: true, firstName: true, visibleName: true },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      course: {
        select: { id: true, courseTitle: true },
      },
    },
  });
}
