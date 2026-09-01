import { prisma } from "@/lib/prisma";
import { DemoBookingStatus } from "@prisma/client";
import {
  getRazorpayClient,
  rupeesToPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";

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
  /**
   * Required (route.ts rejects a missing value before this is
   * even called) — a demo can't be arranged without a specific
   * time, so this is no longer treated as optional the way it
   * briefly was.
   */
  scheduledAt: string;
}

interface ValidatedDemoBooking {
  studentId: string;
  subject: string;
  scheduledDate: Date;
}

/**
 * Shared validation for both the free-demo path and the paid-demo
 * Razorpay order/verify path — student ownership, course existence,
 * a valid future `scheduledAt`, and the 1-per-(teacher, subject,
 * child) cap.
 */
async function validateDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
): Promise<ValidatedDemoBooking> {
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

  const scheduledDate = new Date(input.scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new DemoBookingError(
      "That doesn't look like a valid date and time — pick again.",
      400,
    );
  }

  if (scheduledDate.getTime() < Date.now()) {
    throw new DemoBookingError(
      "Pick a date and time in the future for the demo.",
      400,
    );
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

  return { studentId: input.studentId, subject, scheduledDate };
}

/**
 * Books a FREE demo session (account still has one of its 2 free
 * demos left). No Razorpay involvement at all — this only ever
 * writes a `CONFIRMED` booking with `isPaid: false`.
 *
 * Throws if no free demo remains — callers (route.ts) should check
 * `getDemoCouponBalance()` first and route to the paid order/verify
 * flow below instead.
 */
export async function createFreeDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
) {
  const validated = await validateDemoBooking(parentId, input);
  const coupon = await getOrCreateDemoCoupon(parentId);

  if (coupon.usedCount >= coupon.totalIssued) {
    throw new DemoBookingError(
      "No free demos left on this account — pay to book this demo instead.",
      402,
    );
  }

  const booking = await prisma.$transaction(async (tx) => {
    await tx.demoCoupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return tx.demoBooking.create({
      data: {
        demoCouponId: coupon.id,
        parentId,
        studentId: validated.studentId,
        teacherId: input.teacherId,
        courseId: input.courseId,
        subject: validated.subject,
        isPaid: false,
        amount: null,
        status: DemoBookingStatus.CONFIRMED,
        scheduledAt: validated.scheduledDate,
      },
    });
  });

  return { booking, usedFreeCoupon: true };
}

/**
 * Step 1 of the paid-demo flow (used once the account's 2 free
 * demos are used up). Validates everything a booking needs, then
 * creates a Razorpay Order for the flat ₹100 fee. Nothing is
 * written to the DB yet — same reasoning as
 * enrollment.service.ts's createEnrollmentOrder().
 */
export async function createDemoBookingOrder(
  parentId: string,
  input: CreateDemoBookingInput,
) {
  const validated = await validateDemoBooking(parentId, input);
  const coupon = await getOrCreateDemoCoupon(parentId);

  if (coupon.usedCount < coupon.totalIssued) {
    throw new DemoBookingError(
      "This account still has a free demo available — use the free booking flow instead of paying.",
      400,
    );
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(PAID_DEMO_PRICE),
    currency: "INR",
    receipt: `demo_${Date.now()}`,
    // Full enough to reconstruct the DemoBooking from the webhook
    // alone (src/app/api/webhooks/razorpay/route.ts) if the client
    // never calls /verify.
    notes: {
      kind: "demo_booking",
      parentId,
      studentId: validated.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: validated.subject,
      scheduledAt: validated.scheduledDate.toISOString(),
    },
  });

  return { order, amount: PAID_DEMO_PRICE };
}

export interface VerifyDemoBookingPaymentInput extends CreateDemoBookingInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Step 2 of the paid-demo flow. Same pattern as
 * verifyEnrollmentPayment(): re-verify the checkout signature,
 * re-fetch the order from Razorpay directly, re-validate the
 * booking (student ownership, no duplicate, future time still
 * holds), and only then write the DemoBooking row.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema).
 *
 * Edge case worth knowing about: if the (teacher, subject, child)
 * slot got taken by a different booking in the gap between order
 * creation and payment completing, this throws a 409 AFTER the
 * money has already been captured by Razorpay — that booking can't
 * be created, so it needs a manual refund. Flagged rather than
 * silently swallowed.
 */
export async function verifyDemoBookingPayment(
  parentId: string,
  input: VerifyDemoBookingPaymentInput,
) {
  const existing = await prisma.demoBooking.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return { booking: existing, usedFreeCoupon: false };
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new DemoBookingError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const validated = await validateDemoBooking(parentId, input);

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new DemoBookingError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  if (Number(order.amount) !== rupeesToPaise(PAID_DEMO_PRICE)) {
    throw new DemoBookingError(
      "The paid amount doesn't match the demo fee — contact support with your payment ID for a refund.",
      409,
    );
  }

  const coupon = await getOrCreateDemoCoupon(parentId);

  const booking = await prisma.demoBooking.create({
    data: {
      demoCouponId: coupon.id,
      parentId,
      studentId: validated.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: validated.subject,
      isPaid: true,
      amount: PAID_DEMO_PRICE,
      status: DemoBookingStatus.CONFIRMED,
      scheduledAt: validated.scheduledDate,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      paidAt: new Date(),
    },
  });

  return { booking, usedFreeCoupon: false };
}

/**
 * Reconciliation path used ONLY by the Razorpay webhook — see
 * enrollment.service.ts's `reconcileEnrollmentFromWebhook()` for the
 * full reasoning (same pattern, applied to paid demo bookings).
 */
export async function reconcileDemoBookingFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.demoBooking.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    return existing;
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  const notes = order.notes ?? {};

  if (notes.kind !== "demo_booking") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");
  const studentId = String(notes.studentId ?? "");
  const teacherId = String(notes.teacherId ?? "");
  const courseId = String(notes.courseId ?? "");
  const subject = notes.subject ? String(notes.subject) : "";
  const scheduledAt = notes.scheduledAt ? String(notes.scheduledAt) : "";

  if (!parentId || !studentId || !teacherId || !courseId || !scheduledAt) {
    console.error("Razorpay webhook: demo order missing notes", orderId);
    return null;
  }

  if (Number(order.amount) !== rupeesToPaise(PAID_DEMO_PRICE)) {
    console.error("Razorpay webhook: demo amount mismatch", orderId);
    return null;
  }

  // Duplicate slot check — same as validateDemoBooking(), inlined
  // here since we're working from webhook notes, not a fresh
  // client request.
  const duplicate = await prisma.demoBooking.findUnique({
    where: { teacherId_subject_studentId: { teacherId, subject, studentId } },
  });

  if (duplicate) {
    console.error(
      "Razorpay webhook: demo slot already booked, needs manual refund",
      orderId,
    );
    return null;
  }

  const coupon = await getOrCreateDemoCoupon(parentId);

  return prisma.demoBooking.create({
    data: {
      demoCouponId: coupon.id,
      parentId,
      studentId,
      teacherId,
      courseId,
      subject,
      isPaid: true,
      amount: PAID_DEMO_PRICE,
      status: DemoBookingStatus.CONFIRMED,
      scheduledAt: new Date(scheduledAt),
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
    },
  });
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
