import "server-only";

import { Prisma, LedgerPayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * The Tuition Ledger + Monthly Payout Verification, as real persisted
 * state instead of a report computed on the fly.
 *
 * `createLedgerEntryForCompletedCycle()` is called from
 * cycleProgress.service.ts inside the same transaction that flips
 * cyclePayoutStatus to READY_FOR_PAYOUT — one TuitionLedgerEntry row
 * per completed cycle, snapshotting the 17-field record with a real
 * CCC (sessionsCompleted) instead of the old export-only view's
 * placeholder 0.
 *
 * Everything else here is the Accounts-side "Monthly Payout
 * Verification" workflow (08-PROJECT-KNOWLEDGE-BASE.md — Accounts'
 * 1-day Approve/Reject window per teacher payout): list pending
 * entries, approve, reject. There's no cron/job runner in this
 * project (07-LESSONS-LEARNED.md), so an overdue PENDING_VERIFICATION
 * row is reconciled lazily — flipped to EXPIRED the next time anyone
 * lists the ledger — rather than via a background job. EXPIRED is
 * just a flag for Admin/Accounts to re-decide; it never silently
 * pays or silently withholds money.
 */

const TEACHER_SHARE = 0.7; // 06-OPEN-DECISIONS.md #1: teacher keeps 70%
const PLATFORM_SHARE = 0.3; // Profits = 30% of Monthly_rate
const VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 1-day Approve/Reject window

export class TuitionLedgerError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Creates the ledger row for a just-completed cycle. Meant to be
 * called with the *same* `tx` client the Enrollment update runs in
 * (see cycleProgress.service.ts), so the cycle-progress update and
 * the ledger entry are written atomically — either both happen or
 * neither does.
 *
 * Idempotent against retries: `cycleNumber` + the
 * `@@unique([enrollmentId, cycleNumber])` constraint mean a duplicate
 * call for the same completed cycle is a no-op rather than a second
 * row or a thrown error.
 */
export async function createLedgerEntryForCompletedCycle(
  tx: Prisma.TransactionClient,
  enrollment: {
    id: string;
    parentId: string;
    teacherId: string;
    studentId: string;
    courseId: string;
    cyclesCompleted: number; // already incremented by the caller
    sessionsPerMonth: number;
    noOfMonths: number;
    ratePerSession: Prisma.Decimal;
    monthlyRate: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    dueDate: Date;
  },
) {
  const rate = Number(enrollment.ratePerSession);
  const monthlyRate = Number(enrollment.monthlyRate);
  const now = new Date();

  try {
    return await tx.tuitionLedgerEntry.create({
      data: {
        enrollmentId: enrollment.id,
        cycleNumber: enrollment.cyclesCompleted,
        parentId: enrollment.parentId,
        teacherId: enrollment.teacherId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        transactionDate: now,
        noOfMonths: enrollment.noOfMonths,
        rate: enrollment.ratePerSession,
        monthlyRate: enrollment.monthlyRate,
        totalAmount: enrollment.totalAmount,
        sessionsCompleted: enrollment.sessionsPerMonth,
        dueDate: enrollment.dueDate,
        teacherRate: round2(rate * TEACHER_SHARE),
        monthlyTeacherPay: round2(monthlyRate * TEACHER_SHARE),
        profits: round2(monthlyRate * PLATFORM_SHARE),
        payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
        verificationDeadline: new Date(now.getTime() + VERIFICATION_WINDOW_MS),
      },
    });
  } catch (error) {
    // P2002 = unique constraint violation on [enrollmentId, cycleNumber] —
    // this cycle's ledger row already exists (a retried mark-session
    // call). Treat as success rather than surfacing a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.tuitionLedgerEntry.findUniqueOrThrow({
        where: {
          enrollmentId_cycleNumber: {
            enrollmentId: enrollment.id,
            cycleNumber: enrollment.cyclesCompleted,
          },
        },
      });
    }
    throw error;
  }
}

/**
 * Lazily reconciles overdue PENDING_VERIFICATION rows to EXPIRED.
 * Called at the top of every read path below — same "reconcile on
 * read" pattern the Razorpay webhook uses, since there's no
 * cron/job runner in this project yet.
 */
async function expireOverdueEntries() {
  await prisma.tuitionLedgerEntry.updateMany({
    where: {
      payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION,
      verificationDeadline: { lt: new Date() },
    },
    data: { payoutStatus: LedgerPayoutStatus.EXPIRED },
  });
}

const ledgerEntryInclude = {
  enrollment: {
    include: {
      student: { select: { firstName: true, visibleName: true } },
      parent: { select: { firstName: true, lastName: true } },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      course: { select: { courseTitle: true, subject: true } },
    },
  },
} as const;

function displayName(first: string, last?: string | null, visible?: string | null) {
  if (visible && visible.trim()) return visible;
  return [first, last].filter(Boolean).join(" ").trim();
}

function toLedgerEntryView(
  row: Prisma.TuitionLedgerEntryGetPayload<{ include: typeof ledgerEntryInclude }>,
) {
  const { enrollment } = row;
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    cycleNumber: row.cycleNumber,
    transactionDate: row.transactionDate,
    parentName: displayName(enrollment.parent.firstName, enrollment.parent.lastName),
    childName: displayName(enrollment.student.firstName, undefined, enrollment.student.visibleName),
    teacherName: displayName(
      enrollment.teacher.firstName,
      enrollment.teacher.lastName,
      enrollment.teacher.visibleName,
    ),
    subject: enrollment.subject ?? enrollment.course.subject ?? "",
    noOfMonths: row.noOfMonths,
    rate: Number(row.rate),
    monthlyRate: Number(row.monthlyRate),
    totalAmount: Number(row.totalAmount),
    sessionsCompleted: row.sessionsCompleted, // CCC — real value for this cycle
    dueDate: row.dueDate,
    teacherRate: Number(row.teacherRate),
    monthlyTeacherPay: Number(row.monthlyTeacherPay),
    profits: Number(row.profits),
    payoutStatus: row.payoutStatus,
    verificationDeadline: row.verificationDeadline,
    verifiedByStaffSub: row.verifiedByStaffSub,
    verifiedAt: row.verifiedAt,
    rejectionReason: row.rejectionReason,
    isOverdue:
      row.payoutStatus === LedgerPayoutStatus.PENDING_VERIFICATION &&
      row.verificationDeadline < new Date(),
  };
}

export type TuitionLedgerEntryView = ReturnType<typeof toLedgerEntryView>;

/** Full persisted ledger — one real row per completed cycle. */
export async function listLedgerEntries(): Promise<TuitionLedgerEntryView[]> {
  await expireOverdueEntries();

  const rows = await prisma.tuitionLedgerEntry.findMany({
    include: ledgerEntryInclude,
    orderBy: { transactionDate: "desc" },
  });

  return rows.map(toLedgerEntryView);
}

/** Just the rows Accounts/Admin still need to act on. */
export async function listPendingPayoutVerifications(): Promise<TuitionLedgerEntryView[]> {
  await expireOverdueEntries();

  const rows = await prisma.tuitionLedgerEntry.findMany({
    where: { payoutStatus: LedgerPayoutStatus.PENDING_VERIFICATION },
    include: ledgerEntryInclude,
    orderBy: { verificationDeadline: "asc" },
  });

  return rows.map(toLedgerEntryView);
}

async function findActionableEntry(entryId: string) {
  const entry = await prisma.tuitionLedgerEntry.findUnique({ where: { id: entryId } });

  if (!entry) {
    throw new TuitionLedgerError("Ledger entry not found.", 404);
  }

  if (entry.payoutStatus === LedgerPayoutStatus.APPROVED) {
    throw new TuitionLedgerError("This payout has already been approved.", 409);
  }

  if (entry.payoutStatus === LedgerPayoutStatus.REJECTED) {
    throw new TuitionLedgerError("This payout has already been rejected.", 409);
  }

  return entry;
}

/** Approves a teacher payout. Allowed even if the row already expired — a missed deadline is a flag to notice, not a hard lock. */
export async function approveLedgerPayout(entryId: string, staffSub: string) {
  await findActionableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.APPROVED,
      verifiedByStaffSub: staffSub,
      verifiedAt: new Date(),
      rejectionReason: null,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}

export async function rejectLedgerPayout(entryId: string, staffSub: string, reason?: string) {
  await findActionableEntry(entryId);

  return prisma.tuitionLedgerEntry.update({
    where: { id: entryId },
    data: {
      payoutStatus: LedgerPayoutStatus.REJECTED,
      verifiedByStaffSub: staffSub,
      verifiedAt: new Date(),
      rejectionReason: reason ?? null,
    },
    include: ledgerEntryInclude,
  }).then(toLedgerEntryView);
}

/** Summary cards for the Accounts dashboard. */
export async function getLedgerSummary(rows: TuitionLedgerEntryView[]) {
  return {
    totalCyclesLedgered: rows.length,
    pendingVerificationCount: rows.filter((r) => r.payoutStatus === "PENDING_VERIFICATION").length,
    overdueCount: rows.filter((r) => r.isOverdue).length,
    totalApprovedPayout: rows
      .filter((r) => r.payoutStatus === "APPROVED")
      .reduce((s, r) => s + r.monthlyTeacherPay, 0),
    totalPlatformProfit: rows
      .filter((r) => r.payoutStatus === "APPROVED")
      .reduce((s, r) => s + r.profits, 0),
  };
}
