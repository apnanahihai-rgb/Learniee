import { logActivity } from "@/features/shared/server/activityLog.service";
import { createCycleSessions } from "@/features/shared/server/classSession.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyCycleRenewed } from "@/features/shared/server/notificationTriggers.service";
import { buildCyclePlan, priceForSessions } from "@/features/shared/utils/cyclePlan";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import { calendarDateToDate } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, rupeesToPaise } from "@/lib/razorpay";
import {
    CycleStatus,
    EnrollmentStatus,
    InvoiceType,
    Prisma,
} from "@prisma/client";
import "server-only";
import type { Orders } from "razorpay/dist/types/orders";
import { RenewalError, loadRenewableEnrollment } from './plan';

// `orders.fetch` has a callback overload, so `ReturnType<…>` resolves to
// `void`; use the SDK's own order type instead.
type RazorpayOrder = Orders.RazorpayOrder;

/**
 * The cycle a given Razorpay payment already paid for, if any. This is
 * the idempotency key for renewals: one captured payment can only ever
 * produce one `EnrollmentCycle`, no matter whether `/renew/verify`, the
 * Razorpay webhook, or both (they routinely race) get to it first.
 */
export async function findCycleForPayment(paymentId: string) {
  return prisma.enrollmentCycle.findFirst({
    where: { paymentReference: paymentId },
  });
}

/**
 * Makes sure the renewal's Invoice exists — creating it if it doesn't.
 * Returns `true` when an invoice is in place afterwards.
 *
 * Invoice generation is deliberately non-fatal (a receipt must never
 * roll back money that already moved), which used to mean a failed
 * invoice was simply lost. Now every re-entry point — `/renew/verify`
 * retries, webhook redeliveries, a lost `/verify`-vs-webhook race —
 * calls this, so the invoice gets repaired the next time anything
 * touches that payment. Idempotent on `razorpayOrderId`.
 */
export async function ensureRenewalInvoice(args: {
  cycle: { id: string; enrollmentId: string; cycleNumber: number };
  orderId: string;
  paymentId: string;
  /** Pass when already fetched, to skip a Razorpay round-trip. */
  order?: RazorpayOrder;
}): Promise<boolean> {
  const { cycle, orderId, paymentId } = args;

  const invoiceExists = async () =>
    Boolean(
      await prisma.invoice.findUnique({
        where: { razorpayOrderId: orderId },
        select: { id: true },
      }),
    );

  try {
    if (await invoiceExists()) {
      return true;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: cycle.enrollmentId },
      select: { parentId: true, subject: true },
    });

    if (!enrollment) {
      throw new Error(`Enrollment ${cycle.enrollmentId} not found`);
    }

    const order = args.order ?? (await getRazorpayClient().orders.fetch(orderId));

    await generateInvoiceForPayment({
      type: InvoiceType.CYCLE_RENEWAL_PAYMENT,
      payerId: enrollment.parentId,
      // What Razorpay actually charged (already checked against the
      // expected price before the cycle was created).
      amount: Number(order.amount) / 100,
      description: `Cycle ${cycle.cycleNumber} renewal${
        enrollment.subject ? ` — ${enrollment.subject}` : ""
      }`,
      referenceType: "ENROLLMENT_CYCLE",
      referenceId: cycle.id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    return true;
  } catch (err) {
    // A concurrent caller may have created it between our check and insert.
    try {
      if (await invoiceExists()) {
        return true;
      }
    } catch {
      // fall through to the log below
    }

    console.error(
      `[renewal-invoice] NEEDS REPAIR: invoice not generated for cycle ${cycle.id} (order ${orderId}, payment ${paymentId}):`,
      err,
    );

    return false;
  }
}

/**
 * The one place the next `EnrollmentCycle` + its sessions are written, shared
 * by a Razorpay-paid renewal (`applyPaidRenewal`) and a Wallet-paid one
 * (`renewal/wallet.ts`) so the two can never drift. Runs inside the caller's
 * transaction; `paymentReference` is the Razorpay payment id or the
 * `wallet_ren_…` reference.
 */
export async function createRenewalCycleInTx(
  tx: Prisma.TransactionClient,
  args: {
    enrollmentId: string;
    cycleNumber: number;
    startDate: Date;
    plan: NonNullable<ReturnType<typeof buildCyclePlan>>;
    ratePerSession: Prisma.Decimal | number;
    totalAmount: number;
    paymentReference: string;
    scheduleDays: number[];
    scheduleTime: string;
  },
) {
  const { enrollmentId, cycleNumber, plan, totalAmount, scheduleDays, scheduleTime } = args;

  const created = await tx.enrollmentCycle.create({
    data: {
      enrollmentId,
      cycleNumber,
      startDate: args.startDate,
      endDate: calendarDateToDate(plan.endDate),
      sessionCount: plan.sessionCount,
      ratePerSession: args.ratePerSession,
      price: totalAmount,
      paymentReference: args.paymentReference,
      status: CycleStatus.OPEN,
    },
  });

  const stillActive = await tx.enrollment.updateMany({
    // Conditional on ACTIVE: if `completeEnrollmentIfNoRenewal` won a race and
    // already flipped this Enrollment to COMPLETED between the caller's check
    // and here, this rolls the whole renewal back rather than leaving a
    // COMPLETED Enrollment with a freshly-paid next cycle sitting under it.
    where: { id: enrollmentId, status: EnrollmentStatus.ACTIVE },
    data: {
      scheduleDays,
      scheduleTime,
      sessionsPerMonth: plan.sessionCount,
      monthlyRate: totalAmount,
      totalAmount,
      dueDate: calendarDateToDate(plan.nextCycleStart),
      // A fresh due-date reminder for the *new* dueDate.
      dueDateReminderSentAt: null,
    },
  });

  if (stillActive.count === 0) {
    throw new RenewalError(
      "This enrollment ended before the renewal could finish — contact support with your payment ID.",
      409,
    );
  }

  await createCycleSessions(tx, enrollmentId, cycleNumber);

  return created;
}

export function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Turns a PAID `cycle_renewal` Razorpay order into the next
 * `EnrollmentCycle` (+ its sessions, invoice, notification).
 *
 * Single implementation shared by `verifyRenewalPayment()` (browser
 * confirmed the payment) and `reconcileRenewalFromWebhook()` (browser
 * never came back). The caller has already proven the payment is real
 * — the checkout signature for /verify, the webhook signature for the
 * webhook — and that `order.status === "paid"`. Everything else is
 * re-derived here from the order's own notes, never from client input.
 *
 * Idempotent on `paymentId`: if a cycle already exists for this
 * payment, it's returned untouched (`created: false`). Safe under a
 * /verify-vs-webhook race — the loser of the
 * `(enrollmentId, cycleNumber)` unique constraint re-reads the
 * winner's cycle instead of failing.
 *
 * Throws `RenewalError` when the payment can't be applied (enrollment
 * ended, moved on, amount drifted) — those need a human/refund.
 */
export async function applyPaidRenewal(args: {
  order: RazorpayOrder;
  paymentId: string;
  /** Expected owner. /verify passes the logged-in parent; the webhook passes `notes.parentId`. */
  parentId: string;
  /** If set, the order must be for exactly this enrollment (/verify's URL param). */
  enrollmentId?: string;
}) {
  const { order, paymentId, parentId } = args;
  const notes = (order.notes ?? {}) as Record<string, unknown>;
  const enrollmentId = String(notes.enrollmentId ?? "");

  if (
    notes.kind !== "cycle_renewal" ||
    !enrollmentId ||
    (args.enrollmentId && enrollmentId !== args.enrollmentId)
  ) {
    throw new RenewalError("This payment doesn't match this enrollment's renewal.", 409);
  }

  if (notes.parentId && String(notes.parentId) !== parentId) {
    throw new RenewalError("This payment belongs to another account.", 403);
  }

  const existingCycle = await findCycleForPayment(paymentId);

  if (existingCycle) {
    const invoiceOk = await ensureRenewalInvoice({
      cycle: existingCycle,
      orderId: order.id,
      paymentId,
      order,
    });

    return { cycle: existingCycle, created: false, invoiceOk };
  }

  // The order's own notes are the source of truth for the schedule
  // that was priced and charged — never the client's resent body.
  const scheduleDays = JSON.parse(String(notes.scheduleDays ?? "[]")) as number[];
  const scheduleTime = String(notes.scheduleTime ?? "");
  const cycleNumber = Number(notes.cycleNumber);

  const { enrollment, latestCycle } = await loadRenewableEnrollment(enrollmentId, parentId);

  if (latestCycle.cycleNumber + 1 !== cycleNumber) {
    throw new RenewalError(
      "This enrollment has moved on since this payment was started — contact support with your payment ID.",
      409,
    );
  }

  const ratePerSession = Number(enrollment.ratePerSession);
  const totalAmount = priceForSessions(ratePerSession, Number(notes.sessionCount));

  const { amountPayable } = priceWithInternationalSurcharge(
    totalAmount,
    enrollment.parent ? isInternationalParent(enrollment.parent) : false,
  );

  if (Number(order.amount) !== rupeesToPaise(amountPayable)) {
    throw new RenewalError(
      "The paid amount no longer matches this enrollment's current rate — contact support with your payment ID for a refund.",
      409,
    );
  }

  const startDate = new Date(String(notes.cycleStartDate));
  const plan = buildCyclePlan(
    String(notes.cycleStartDate),
    scheduleDays,
    enrollment.planType,
  );

  if (!plan) {
    throw new RenewalError("Couldn't rebuild this renewal's cycle — contact support.", 500);
  }

  let cycle;

  try {
    cycle = await prisma.$transaction(
      (tx) =>
        createRenewalCycleInTx(tx, {
          enrollmentId,
          cycleNumber,
          startDate,
          plan,
          ratePerSession: enrollment.ratePerSession,
          totalAmount,
          paymentReference: paymentId,
          scheduleDays,
          scheduleTime,
        }),
      { timeout: 15_000 },
    );
  } catch (err) {
    // Lost the race to a concurrent /verify or webhook call for the
    // same payment: its cycle is the one that counts.
    if (isUniqueViolation(err)) {
      const winner = await findCycleForPayment(paymentId);

      if (winner) {
        // The winning call owns invoice generation.
        return { cycle: winner, created: false, invoiceOk: true };
      }

      // Unique violation but not for this payment: the next cycle was
      // already bought with a DIFFERENT payment (a double payment).
      throw new RenewalError(
        "This enrollment was already renewed with another payment — contact support with your payment ID for a refund.",
        409,
      );
    }

    throw err;
  }

  // Non-fatal for the renewal itself; `invoiceOk` lets the webhook ask
  // Razorpay to redeliver so the invoice gets repaired on the retry.
  const invoiceOk = await ensureRenewalInvoice({
    cycle,
    orderId: order.id,
    paymentId,
    order,
  });

  try {
    await notifyCycleRenewed(enrollmentId, cycleNumber);

    await logActivity({
      action: "CYCLE_RENEWED",
      actorRole: "PARENT",
      actorId: parentId,
      description: `Enrollment ${enrollmentId} renewed for cycle ${cycleNumber} (${plan.sessionCount} sessions).`,
      metadata: { enrollmentId, cycleNumber, sessionCount: plan.sessionCount },
    });
  } catch (err) {
    console.error("Post-renewal notify/log failed (renewal still succeeded):", err);
  }

  return { cycle, created: true, invoiceOk };
}
