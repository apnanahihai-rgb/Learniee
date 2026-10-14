import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import {
  ClassSessionStatus,
  CycleCloseReason,
  CycleStatus,
  EnrollmentStatus,
  InvoiceType,
  Prisma,
  RescheduleRequestStatus,
} from "@prisma/client";
import "server-only";

/**
 * Refund vs Enrollment (Oct 14, 2026).
 *
 * Before this, approving a refund only credited the Wallet: the Enrollment,
 * its classes and the teacher's payout carried on as if nothing was refunded.
 *
 * Rule, applied INSIDE the refund-approval transaction and only when the
 * payment is now FULLY refunded:
 *
 *   1. Enrollment not yet active (waiting for approvals) -> Enrollment becomes
 *      CANCELLED and its cycle is closed with nothing counted and no payout.
 *   2. Active Enrollment, and the refunded cycle is its latest and only open
 *      cycle -> every class that has not started is cancelled (no make-up, no
 *      strike) and, after the transaction commits, the cycle is closed by the
 *      normal close rule. The teacher is still paid for classes that already
 *      counted; the Enrollment then ends as COMPLETED.
 *   3. Anything else (partial refund, cycle already closed, an older/other open
 *      cycle, legacy enrollment) -> nothing is changed and Admin gets a notice
 *      saying what to check by hand. These are deliberately not automated:
 *      changing them silently could end an Enrollment that is still running.
 */

type Tx = Prisma.TransactionClient;

export interface RefundEnrollmentEffect {
  /** Cycle to run the normal close rule on AFTER the transaction commits. */
  closeCycleId: string | null;
  /** Plain-language lines for Admin. */
  notices: string[];
}

const NOT_YET_ACTIVE: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  EnrollmentStatus.PENDING_ADMIN_APPROVAL,
];

export async function applyRefundToEnrollmentInTx(
  tx: Tx,
  input: {
    invoiceType: InvoiceType;
    invoiceReferenceId: string;
    fullyRefunded: boolean;
    now: Date;
  },
): Promise<RefundEnrollmentEffect> {
  const none: RefundEnrollmentEffect = { closeCycleId: null, notices: [] };

  if (
    input.invoiceType !== InvoiceType.ENROLLMENT_PAYMENT &&
    input.invoiceType !== InvoiceType.CYCLE_RENEWAL_PAYMENT
  ) {
    return none;
  }

  if (!input.fullyRefunded) {
    return {
      ...none,
      notices: [
        "Partial refund: the enrollment and its classes were left unchanged. Cancel or adjust them by hand if needed.",
      ],
    };
  }

  // Find the enrollment + the cycle this payment bought.
  let enrollmentId: string;
  let cycleId: string | null = null;

  if (input.invoiceType === InvoiceType.CYCLE_RENEWAL_PAYMENT) {
    const cycle = await tx.enrollmentCycle.findUnique({
      where: { id: input.invoiceReferenceId },
      select: { id: true, enrollmentId: true },
    });

    if (!cycle) {
      return { ...none, notices: ["The refunded payment's cycle was not found — check the enrollment by hand."] };
    }

    enrollmentId = cycle.enrollmentId;
    cycleId = cycle.id;
  } else {
    enrollmentId = input.invoiceReferenceId;
  }

  const enrollment = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      status: true,
      isLegacy: true,
      cycles: { select: { id: true, cycleNumber: true, status: true }, orderBy: { cycleNumber: "asc" } },
    },
  });

  if (!enrollment) {
    return { ...none, notices: ["The refunded payment's enrollment was not found — nothing was changed."] };
  }

  if (enrollment.isLegacy) {
    return {
      ...none,
      notices: ["This is a legacy enrollment: its classes were left unchanged. Cancel them by hand if needed."],
    };
  }

  const cycle =
    enrollment.cycles.find((c) => c.id === cycleId) ??
    enrollment.cycles.find((c) => c.cycleNumber === 1) ??
    null;

  if (!cycle) {
    return { ...none, notices: ["No cycle record found for this payment — nothing was changed."] };
  }

  await lockCycle(tx, cycle.id);

  /* 1 — not yet active */
  if (NOT_YET_ACTIVE.includes(enrollment.status)) {
    const cancelled = await tx.enrollment.updateMany({
      where: { id: enrollment.id, status: { in: NOT_YET_ACTIVE } },
      data: { status: EnrollmentStatus.CANCELLED },
    });

    if (cancelled.count === 0) {
      return { ...none, notices: ["The enrollment changed while refunding — check it by hand."] };
    }

    await tx.enrollmentCycle.updateMany({
      where: { id: cycle.id, status: CycleStatus.OPEN },
      data: {
        status: CycleStatus.CLOSED,
        closedAt: input.now,
        closeReason: CycleCloseReason.WINDOW_ENDED,
        countedSessionCount: 0,
        forfeitedSessionCount: 0,
        excusedSessionCount: 0,
        payoutReleasedAt: input.now,
      },
    });

    return { ...none, notices: ["The enrollment had not started: it was cancelled and no teacher payout will be created."] };
  }

  /* 2 — active, latest and only open cycle */
  const isLatest = enrollment.cycles[enrollment.cycles.length - 1]?.id === cycle.id;
  const otherOpen = enrollment.cycles.some((c) => c.id !== cycle.id && c.status === CycleStatus.OPEN);

  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    return { ...none, notices: [`The enrollment is ${enrollment.status}: its classes were left unchanged.`] };
  }

  if (cycle.status !== CycleStatus.OPEN) {
    return {
      ...none,
      notices: [
        "That cycle had already closed, so its classes and teacher payout were left unchanged. Check the payout by hand.",
      ],
    };
  }

  if (!isLatest || otherOpen) {
    return {
      ...none,
      notices: [
        "The enrollment has another open or later cycle, so it was left running. Cancel the refunded cycle's classes by hand.",
      ],
    };
  }

  const future = await tx.classSession.findMany({
    where: { cycleId: cycle.id, status: ClassSessionStatus.SCHEDULED, startsAt: { gt: input.now } },
    select: { id: true },
  });
  const ids = future.map((s) => s.id);

  if (ids.length > 0) {
    await tx.rescheduleRequest.updateMany({
      where: {
        classSessionId: { in: ids },
        status: {
          in: [
            RescheduleRequestStatus.PENDING_TEACHER_APPROVAL,
            RescheduleRequestStatus.PENDING_PARENT_APPROVAL,
          ],
        },
      },
      data: { status: RescheduleRequestStatus.CANCELLED },
    });

    // "PARENT" + a recorded follow-up: no make-up, no strike, nothing to confirm.
    await tx.classSession.updateMany({
      where: { id: { in: ids }, status: ClassSessionStatus.SCHEDULED },
      data: {
        status: ClassSessionStatus.CANCELLED,
        cancelledAt: input.now,
        cancelledByRole: "PARENT",
        cancelReason: "Payment refunded.",
        resolvedAt: input.now,
        followUpAppliedAt: input.now,
        settledAt: input.now,
      },
    });
  }

  return {
    closeCycleId: cycle.id,
    notices: [
      `${ids.length} upcoming class${ids.length === 1 ? "" : "es"} cancelled. The cycle closes once any class already in progress is final; the teacher is still paid for classes that already counted.`,
    ],
  };
}
