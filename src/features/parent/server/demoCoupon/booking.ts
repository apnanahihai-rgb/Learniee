import { addTransactionCharge, type PaymentMethodChoice } from "@/lib/transactionCharges";
import { notifyDemoBooked } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    rupeesToPaise
} from "@/lib/razorpay";
import { DemoBookingStatus } from "@prisma/client";
import { DemoBookingError, getOrCreateDemoCoupon, priceDemoBooking } from './shared';
import { getTeacherAvailability } from "@/features/shared/server/teacherAvailability.service";
import { fitsAvailability } from "@/features/shared/utils/availability";
import { dateToCalendarDate, weekdayOf } from "@/lib/platformTime";

/** Demo length used to check it fits inside the teacher's availability. */
const DEMO_LENGTH_MINUTES = 60;

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
export async function validateDemoBooking(
  parentId: string,
  input: CreateDemoBookingInput,
  // Only when the booking is first made (free booking / order creation).
  // The verify step must NOT re-check this: the parent has already paid,
  // and a teacher editing their timings meanwhile must not strand the money.
  options: { enforceAvailability?: boolean } = {},
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

  if (options.enforceAvailability) {
    const slots = await getTeacherAvailability(input.teacherId);

    if (slots.length === 0) {
      throw new DemoBookingError(
        "This teacher hasn't set their availability yet — please check back soon.",
        409,
      );
    }

    // Weekday + wall-clock in the platform timezone (IST), never server time.
    const istParts = new Date(scheduledDate.getTime() + 330 * 60_000);
    const day = weekdayOf(dateToCalendarDate(istParts));
    const hh = String(istParts.getUTCHours()).padStart(2, "0");
    const mm = String(istParts.getUTCMinutes()).padStart(2, "0");

    if (!fitsAvailability(slots, day, `${hh}:${mm}`, DEMO_LENGTH_MINUTES)) {
      throw new DemoBookingError(
        "That time is outside the teacher's available timings — pick one of the listed times.",
        409,
      );
    }
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
  const validated = await validateDemoBooking(parentId, input, {
    enforceAvailability: true,
  });
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

  await notifyDemoBooked(booking.id);

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
  paymentMethod: PaymentMethodChoice = "OTHER",
) {
  const validated = await validateDemoBooking(parentId, input, {
    enforceAvailability: true,
  });
  const coupon = await getOrCreateDemoCoupon(parentId);

  if (coupon.usedCount < coupon.totalIssued) {
    throw new DemoBookingError(
      "This account still has a free demo available — use the free booking flow instead of paying.",
      400,
    );
  }

  const pricing = await priceDemoBooking(parentId);
  // UPI adds a transaction charge on top (see src/lib/transactionCharges.ts).
  const { transactionCharge, total: payNow } = addTransactionCharge(
    pricing.amountPayable,
    paymentMethod,
  );
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(payNow),
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

  return {
    order,
    amount: payNow,
    pricing: { ...pricing, transactionChargeAmount: transactionCharge, amountPayable: payNow },
  };
}
export interface VerifyDemoBookingPaymentInput extends CreateDemoBookingInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
