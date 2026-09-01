import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import {
  getRazorpayClient,
  rupeesToPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";

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

interface PricedEnrollment {
  studentId: string;
  subject: string | null;
  sessionsPerMonth: number;
  noOfMonths: number;
  ratePerSession: number;
  monthlyRate: number;
  totalAmount: number;
  cycleStartDate: Date;
  dueDate: Date;
}

/**
 * All the validation + pricing that used to live inline in
 * `createEnrollment()`. Pulled out so both the payment-order step
 * and the payment-verify step run the exact same server-side
 * calculation — the client's price preview is never trusted for the
 * actual charge amount.
 *
 * Pricing formula (flagged back in 06-OPEN-DECISIONS.md as an
 * assumption pending sign-off — see schema.prisma's Enrollment
 * doc-comment for the full reasoning):
 *   ratePerSession = Course.price
 *   monthlyRate    = ratePerSession * sessionsPerMonth
 *   totalAmount    = monthlyRate * noOfMonths
 *   dueDate        = cycleStartDate + 1 month
 */
async function priceEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
): Promise<PricedEnrollment> {
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

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth: input.sessionsPerMonth,
    noOfMonths,
    ratePerSession,
    monthlyRate,
    totalAmount,
    cycleStartDate,
    dueDate,
  };
}

/**
 * Step 1 of the paid-enrollment flow. Validates + prices the
 * enrollment exactly like before, but instead of writing an
 * Enrollment row, creates a Razorpay Order for `totalAmount` (in
 * INR — see src/lib/razorpay.ts for why no forex math happens on
 * our side) and returns it for the client to open Razorpay
 * Checkout against.
 *
 * DECIDED (resolves 06-OPEN-DECISIONS.md #36): Enrollment creation
 * now blocks on payment — no Enrollment row exists until
 * `verifyEnrollmentPayment()` confirms the charge. Nothing is
 * written to the DB here, so an abandoned checkout just leaves no
 * trace instead of a stray unpaid row.
 */
export async function createEnrollmentOrder(
  parentId: string,
  input: CreateEnrollmentInput,
) {
  const priced = await priceEnrollment(parentId, input);

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(priced.totalAmount),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `enr_${Date.now()}`,
    // Full enough to reconstruct the Enrollment from the webhook
    // alone (src/app/api/webhooks/razorpay/route.ts) if the client
    // never calls /verify — e.g. tab closed right after paying.
    notes: {
      kind: "enrollment",
      parentId,
      studentId: priced.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: priced.subject ?? "",
      sessionsPerMonth: priced.sessionsPerMonth,
      noOfMonths: priced.noOfMonths,
      cycleStartDate: priced.cycleStartDate.toISOString(),
    },
  });

  return { order, pricing: priced };
}

export interface VerifyEnrollmentPaymentInput extends CreateEnrollmentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Step 2 of the paid-enrollment flow. Re-verifies the checkout
 * signature, re-fetches the order from Razorpay directly (never
 * trusts the amount the client reports back), re-runs the exact
 * same pricing used to create the order, and only then writes the
 * Enrollment row.
 *
 * Idempotent on `razorpayOrderId` (unique in the schema) — if this
 * is called twice for the same order (e.g. a retried client
 * request after a flaky network response), the second call just
 * returns the already-created Enrollment instead of erroring or
 * double-charging/double-creating.
 */
export async function verifyEnrollmentPayment(
  parentId: string,
  input: VerifyEnrollmentPaymentInput,
) {
  const existing = await prisma.enrollment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new EnrollmentError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const priced = await priceEnrollment(parentId, input);

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new EnrollmentError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const expectedPaise = rupeesToPaise(priced.totalAmount);

  if (Number(order.amount) !== expectedPaise) {
    // The order amount no longer matches what this course/cycle
    // combination prices to right now (e.g. Course.price changed
    // mid-checkout) — refuse rather than create an Enrollment for
    // the wrong amount. The payment itself already succeeded
    // against Razorpay's order, so this needs a manual refund.
    throw new EnrollmentError(
      "The paid amount no longer matches this course's current price — contact support with your payment ID for a refund.",
      409,
    );
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: priced.studentId,
      parentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: priced.subject,
      sessionsPerMonth: priced.sessionsPerMonth,
      noOfMonths: priced.noOfMonths,
      ratePerSession: priced.ratePerSession,
      monthlyRate: priced.monthlyRate,
      totalAmount: priced.totalAmount,
      cycleStartDate: priced.cycleStartDate,
      dueDate: priced.dueDate,
      status: EnrollmentStatus.PENDING_APPROVAL,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      amountPaid: priced.totalAmount,
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
          studentId: priced.studentId,
        },
      },
    },
  });

  return enrollment;
}

/**
 * Reconciliation path used ONLY by the Razorpay webhook
 * (src/app/api/webhooks/razorpay/route.ts) for `payment.captured`
 * events on `kind: "enrollment"` orders. Unlike
 * `verifyEnrollmentPayment()`, there's no browser-side checkout
 * signature here — the webhook route itself is the trust boundary
 * (it verifies `X-Razorpay-Signature` against the raw body before
 * ever calling this). This is the safety net for the case where the
 * client paid successfully but never called `/verify` (closed tab,
 * lost network, etc.) — without it, Razorpay would have captured
 * money for an Enrollment that never got created.
 *
 * Idempotent on `razorpayOrderId`, same as `verifyEnrollmentPayment()`.
 */
export async function reconcileEnrollmentFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.enrollment.findUnique({
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

  if (notes.kind !== "enrollment") {
    return null;
  }

  const input: CreateEnrollmentInput = {
    studentId: String(notes.studentId ?? ""),
    teacherId: String(notes.teacherId ?? ""),
    courseId: String(notes.courseId ?? ""),
    subject: notes.subject ? String(notes.subject) : null,
    sessionsPerMonth: Number(notes.sessionsPerMonth),
    noOfMonths: Number(notes.noOfMonths) || 1,
    cycleStartDate: notes.cycleStartDate ? String(notes.cycleStartDate) : undefined,
  };
  const parentId = String(notes.parentId ?? "");

  if (!parentId || !input.studentId || !input.teacherId || !input.courseId) {
    console.error("Razorpay webhook: enrollment order missing notes", orderId);
    return null;
  }

  const priced = await priceEnrollment(parentId, input);
  const expectedPaise = rupeesToPaise(priced.totalAmount);

  if (Number(order.amount) !== expectedPaise) {
    console.error("Razorpay webhook: enrollment amount mismatch", orderId);
    return null;
  }

  return prisma.enrollment.create({
    data: {
      studentId: priced.studentId,
      parentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: priced.subject,
      sessionsPerMonth: priced.sessionsPerMonth,
      noOfMonths: priced.noOfMonths,
      ratePerSession: priced.ratePerSession,
      monthlyRate: priced.monthlyRate,
      totalAmount: priced.totalAmount,
      cycleStartDate: priced.cycleStartDate,
      dueDate: priced.dueDate,
      status: EnrollmentStatus.PENDING_APPROVAL,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountPaid: priced.totalAmount,
      chatRoom: {
        create: {
          parentId,
          teacherId: input.teacherId,
          courseId: input.courseId,
          studentId: priced.studentId,
        },
      },
    },
  });
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
