import { prisma } from "@/lib/prisma";
import { DemoBookingStatus } from "@prisma/client";

/**
 * DECIDED (06-OPEN-DECISIONS.md #26): every ParentProfile gets 2
 * free demo sessions, then a flat ₹100 each. This is per ACCOUNT,
 * not per child — a parent with 3 children still only gets 2 free
 * demos total, shared across all of them.
 */
const FREE_DEMOS_PER_ACCOUNT = 2;
const PAID_DEMO_PRICE = 100;

export class DemoBookingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves the logged-in parent's DemoCoupon row, creating it on
 * first use. Accounts that onboarded before this feature existed
 * won't have a DemoCoupon row yet — this lazily backfills one
 * instead of requiring a one-off migration script to issue coupons
 * to every existing ParentProfile.
 */
export async function getOrCreateDemoCoupon(parentId: string) {
  const existing = await prisma.demoCoupon.findUnique({
    where: { parentId },
  });

  if (existing) {
    return existing;
  }

  return prisma.demoCoupon.create({
    data: {
      parentId,
      totalIssued: FREE_DEMOS_PER_ACCOUNT,
      usedCount: 0,
    },
  });
}

/**
 * The balance shape the Parent dashboard/course-detail page needs:
 * how many free demos are left, and what a paid demo costs once
 * they run out.
 */
export async function getDemoCouponBalance(parentId: string) {
  const coupon = await getOrCreateDemoCoupon(parentId);
  const remainingFree = Math.max(coupon.totalIssued - coupon.usedCount, 0);

  return {
    totalIssued: coupon.totalIssued,
    usedCount: coupon.usedCount,
    remainingFree,
    paidDemoPrice: PAID_DEMO_PRICE,
  };
}

export interface CreateDemoBookingInput {
  studentId: string;
  teacherId: string;
  courseId: string;
  subject?: string | null;
  scheduledAt?: string | null;
}

/**
 * Books a demo session for one child, with one teacher, for one
 * course/subject.
 *
 * - Confirms the Student belongs to the requesting parent (same
 *   not-found-vs-not-yours guard as student.service.ts).
 * - Enforces the 1-demo-per-(teacher, subject, child) cap from
 *   06-OPEN-DECISIONS.md #26 via the DemoBooking model's compound
 *   unique constraint.
 * - Consumes a free coupon if the account has one left; otherwise
 *   records the booking as a flat ₹100 charge. Razorpay isn't
 *   integrated yet (02-ARCHITECTURE.md), so a paid demo is recorded
 *   as PENDING_PAYMENT rather than actually collecting payment —
 *   wire this to a real charge once the gateway exists.
 */
export async function createDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new DemoBookingError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, teacherId: input.teacherId },
    select: { id: true, subject: true },
  });

  if (!course) {
    throw new DemoBookingError("Course not found.", 404);
  }

  const subject = (input.subject ?? course.subject ?? "").trim();

  const existingBooking = await prisma.demoBooking.findUnique({
    where: {
      teacherId_subject_studentId: {
        teacherId: input.teacherId,
        subject,
        studentId: input.studentId,
      },
    },
  });

  if (existingBooking) {
    throw new DemoBookingError(
      "A demo with this teacher for this subject has already been used for this child.",
      409,
    );
  }

  const coupon = await getOrCreateDemoCoupon(parentId);
  const hasFreeDemo = coupon.usedCount < coupon.totalIssued;

  const booking = await prisma.$transaction(async (tx) => {
    if (hasFreeDemo) {
      await tx.demoCoupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return tx.demoBooking.create({
      data: {
        demoCouponId: coupon.id,
        parentId,
        studentId: input.studentId,
        teacherId: input.teacherId,
        courseId: input.courseId,
        subject,
        isPaid: !hasFreeDemo,
        amount: hasFreeDemo ? null : PAID_DEMO_PRICE,
        status: hasFreeDemo
          ? DemoBookingStatus.CONFIRMED
          : DemoBookingStatus.PENDING_PAYMENT,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });
  });

  return {
    booking,
    usedFreeCoupon: hasFreeDemo,
  };
}

/**
 * Lists every demo booking a parent has made, most recent first —
 * for a future "My demo bookings" view. Not wired into any screen
 * yet, but kept alongside the write path so it doesn't need to be
 * built twice.
 */
export async function getDemoBookingsForParent(parentId: string) {
  return prisma.demoBooking.findMany({
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
