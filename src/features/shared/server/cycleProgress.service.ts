import { prisma } from "@/lib/prisma";
import { CyclePayoutStatus, EnrollmentStatus } from "@prisma/client";

import { createLedgerEntryForCompletedCycle } from "@/features/shared/server/tuitionLedger.service";

/**
 * Cycle progress tracking (added Sep 3, 2026).
 *
 * A "cycle" is just one calendar month's worth of sessions —
 * `Enrollment.sessionsPerMonth`. This service is the one place that
 * increments `sessionsCompletedInCycle`. Today the only caller is
 * the Teacher-only "mark session complete" endpoint (manual, one
 * click per session) — this is a deliberate placeholder. Per direct
 * instruction, the real increment source will be swapped out once
 * class scheduling exists and this is wired up to Zoho (both
 * Parent and Teacher confirming a class happened), without changing
 * the shape of what's stored here.
 *
 * Payout gating: `cyclePayoutStatus` flips to READY_FOR_PAYOUT the
 * moment a cycle's sessions are all marked done. As of this change,
 * that same moment also writes a real TuitionLedgerEntry row
 * (tuitionLedger.service.ts) — the Tuition Ledger's "17-field record
 * per enrollment/payment cycle" — starting the Monthly Payout
 * Verification workflow. Both writes happen in one transaction so
 * the cycle-progress update and the ledger entry can't drift apart.
 */

export class CycleProgressError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const cycleProgressInclude = {
  student: { select: { id: true, firstName: true, visibleName: true } },
  course: { select: { id: true, courseTitle: true } },
} as const;

/**
 * Marks one session as completed for this cycle, on behalf of the
 * owning Teacher. Only allowed while the Enrollment is ACTIVE (no
 * point tracking progress on a lapsed/cancelled/pending row).
 *
 * When the running count reaches `sessionsPerMonth`:
 *   - `sessionsCompletedInCycle` resets to 0
 *   - `cyclesCompleted` increments by 1
 *   - `cyclePayoutStatus` flips to READY_FOR_PAYOUT
 * Otherwise it just increments and stays IN_PROGRESS.
 *
 * `lastClassAt` (the existing auto-lapse field, 06-OPEN-DECISIONS.md
 * #27) is also bumped here — this is the closest thing to a "class
 * happened" signal that exists today, ahead of `ClassSession` being
 * built.
 */
export async function markSessionCompleted(
  enrollmentId: string,
  teacherId: string,
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, teacherId },
  });

  if (!enrollment) {
    throw new CycleProgressError(
      "Enrollment not found, or doesn't belong to you.",
      404,
    );
  }

  if (enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new CycleProgressError(
      "Sessions can only be marked complete for an active enrollment.",
    );
  }

  const now = new Date();
  const nextCount = enrollment.sessionsCompletedInCycle + 1;
  const cycleJustCompleted = nextCount >= enrollment.sessionsPerMonth;

  if (!cycleJustCompleted) {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        sessionsCompletedInCycle: nextCount,
        lastSessionMarkedAt: now,
        lastClassAt: now,
      },
      include: cycleProgressInclude,
    });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        sessionsCompletedInCycle: 0,
        cyclesCompleted: { increment: 1 },
        cyclePayoutStatus: CyclePayoutStatus.READY_FOR_PAYOUT,
        lastSessionMarkedAt: now,
        lastClassAt: now,
      },
      include: cycleProgressInclude,
    });

    await createLedgerEntryForCompletedCycle(tx, updated);

    return updated;
  });
}
