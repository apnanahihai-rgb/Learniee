import "server-only";

import { Prisma, LedgerPayoutStatus, PayoutRecordStatus, PayoutBatchStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { initiateStubTeacherPayout } from "@/lib/teacherPayoutGateway";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { notifyPayoutPaid } from "@/features/shared/server/notificationTriggers.service";

/**
 * Teacher Payouts — the Payment Queue / mass-pay half (Sep 9, 2026).
 * The Verify/Admin-review half lives in `tuitionLedger.service.ts`
 * (it only needs `TuitionLedgerEntry`); this file owns everything
 * that needs `BankAccount`/`PayoutBatch`/`PayoutRecord` instead.
 *
 * The actual money movement is a STUB — see
 * `src/lib/teacherPayoutGateway.ts`'s doc-comment for why (RazorpayX
 * Payouts isn't confirmed enabled yet) and what swapping it for a
 * real call looks like.
 */

export class TeacherPayoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Bank account — Teacher self-service
// ---------------------------------------------------------------------------

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface UpsertBankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  branchName?: string;
}

export async function getBankAccountForTeacher(teacherId: string) {
  return prisma.bankAccount.findUnique({ where: { teacherId } });
}

export async function upsertBankAccountForTeacher(
  teacherId: string,
  input: UpsertBankAccountInput,
) {
  const accountHolderName = input.accountHolderName?.trim();
  const accountNumber = input.accountNumber?.trim();
  const ifscCode = input.ifscCode?.trim().toUpperCase();

  if (!accountHolderName) {
    throw new TeacherPayoutError("Account holder name is required.");
  }

  if (!accountNumber || !/^\d{9,18}$/.test(accountNumber)) {
    throw new TeacherPayoutError("Enter a valid bank account number (9–18 digits).");
  }

  if (!ifscCode || !IFSC_PATTERN.test(ifscCode)) {
    throw new TeacherPayoutError("Enter a valid IFSC code (e.g. HDFC0001234).");
  }

  return prisma.bankAccount.upsert({
    where: { teacherId },
    create: {
      teacherId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: input.bankName?.trim() || null,
      branchName: input.branchName?.trim() || null,
    },
    update: {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: input.bankName?.trim() || null,
      branchName: input.branchName?.trim() || null,
    },
  });
}

// ---------------------------------------------------------------------------
// Payment Queue — Accounts' second tab, grouped by teacher
// ---------------------------------------------------------------------------

export interface PayoutQueueTeacherGroup {
  teacherId: string;
  teacherName: string;
  email: string;
  hasBankAccount: boolean;
  cycleCount: number;
  totalAmount: number;
  entryIds: string[];
}

function teacherDisplayName(t: {
  firstName: string;
  lastName: string;
  visibleName: string | null;
}) {
  return t.visibleName?.trim() || `${t.firstName} ${t.lastName}`.trim();
}

/** Every QUEUED_FOR_PAYMENT cycle, grouped by teacher — the Payment tab's row list. */
export async function listPaymentQueueGroupedByTeacher(): Promise<PayoutQueueTeacherGroup[]> {
  const entries = await prisma.tuitionLedgerEntry.findMany({
    where: { payoutStatus: LedgerPayoutStatus.QUEUED_FOR_PAYMENT },
    include: {
      enrollment: {
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              visibleName: true,
              email: true,
              bankAccount: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { transactionDate: "asc" },
  });

  const groups = new Map<string, PayoutQueueTeacherGroup>();

  for (const entry of entries) {
    const teacher = entry.enrollment.teacher;
    const existing = groups.get(teacher.id);
    const amount = Number(entry.monthlyTeacherPay);

    if (existing) {
      existing.cycleCount += 1;
      existing.totalAmount = round2(existing.totalAmount + amount);
      existing.entryIds.push(entry.id);
    } else {
      groups.set(teacher.id, {
        teacherId: teacher.id,
        teacherName: teacherDisplayName(teacher),
        email: teacher.email,
        hasBankAccount: !!teacher.bankAccount,
        cycleCount: 1,
        totalAmount: amount,
        entryIds: [entry.id],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

// ---------------------------------------------------------------------------
// Mass-pay
// ---------------------------------------------------------------------------

export interface MassPayResult {
  batchId: string;
  status: PayoutBatchStatus;
  paidTeacherIds: string[];
  skippedTeacherIds: string[];
  totalAmount: number;
}

/**
 * Pays every selected teacher's currently-queued cycles in one
 * batch. A teacher with no `BankAccount` on file is skipped (their
 * `TuitionLedgerEntry` rows stay QUEUED_FOR_PAYMENT for the next
 * batch, once they add one) rather than failing the whole action —
 * that's the point of "mass pay everyone else without blocking on
 * one missing bank account."
 *
 * Each teacher's own PayoutRecord + ledger-entry updates are one
 * transaction; the batch summary row is written after every teacher
 * has been processed, so its counts are always accurate even if
 * something in the middle throws (caught per-teacher, not aborting
 * the whole batch).
 */
export async function massPayTeachers(
  teacherIds: string[],
  staffSub: string,
): Promise<MassPayResult> {
  const uniqueTeacherIds = Array.from(new Set(teacherIds));

  if (uniqueTeacherIds.length === 0) {
    throw new TeacherPayoutError("Select at least one teacher to pay.");
  }

  const groups = await listPaymentQueueGroupedByTeacher();
  const selected = groups.filter((g) => uniqueTeacherIds.includes(g.teacherId));

  if (selected.length === 0) {
    throw new TeacherPayoutError("None of the selected teachers currently have a queued payout.");
  }

  // `hasBankAccount` already comes back from the grouped query above,
  // so who's payable vs. skipped is known up front — the PayoutBatch
  // row can be created once, with its final counts, instead of a
  // placeholder-then-patch approach (which would also violate the FK
  // constraint on PayoutRecord.payoutBatchId).
  const payable = selected.filter((g) => g.hasBankAccount);
  const skipped = selected.filter((g) => !g.hasBankAccount);
  const totalAmount = round2(payable.reduce((s, g) => s + g.totalAmount, 0));

  const batch = await prisma.payoutBatch.create({
    data: {
      initiatedByStaffSub: staffSub,
      totalAmount,
      teacherCount: selected.length,
      successCount: payable.length,
      skippedCount: skipped.length,
      status: skipped.length > 0 ? PayoutBatchStatus.PARTIALLY_COMPLETED : PayoutBatchStatus.COMPLETED,
    },
  });

  for (const group of skipped) {
    // Recorded as a SKIPPED PayoutRecord (audit trail of "we tried,
    // no bank account on file") but never touches the ledger
    // entries — they stay QUEUED_FOR_PAYMENT for the next batch.
    await prisma.payoutRecord.create({
      data: {
        payoutBatchId: batch.id,
        teacherId: group.teacherId,
        amount: group.totalAmount,
        cycleCount: group.cycleCount,
        status: PayoutRecordStatus.SKIPPED_NO_BANK_ACCOUNT,
        failureReason: "No bank account on file for this teacher.",
      },
    });
  }

  const paidTeacherIds: string[] = [];

  for (const group of payable) {
    const bankAccount = await prisma.bankAccount.findUnique({ where: { teacherId: group.teacherId } });

    // Defensive — hasBankAccount came from the same query moments
    // ago, but re-check rather than assume nothing changed.
    if (!bankAccount) {
      await prisma.payoutRecord.create({
        data: {
          payoutBatchId: batch.id,
          teacherId: group.teacherId,
          amount: group.totalAmount,
          cycleCount: group.cycleCount,
          status: PayoutRecordStatus.SKIPPED_NO_BANK_ACCOUNT,
          failureReason: "Bank account was removed between listing and payout.",
        },
      });
      continue;
    }

    const gatewayResult = await initiateStubTeacherPayout({
      teacherId: group.teacherId,
      amountInRupees: group.totalAmount,
      bankAccount: {
        accountHolderName: bankAccount.accountHolderName,
        accountNumber: bankAccount.accountNumber,
        ifscCode: bankAccount.ifscCode,
      },
    });

    await prisma.$transaction(async (tx) => {
      const record = await tx.payoutRecord.create({
        data: {
          payoutBatchId: batch.id,
          teacherId: group.teacherId,
          amount: group.totalAmount,
          cycleCount: group.cycleCount,
          status: PayoutRecordStatus.SUCCESS,
          bankAccountSnapshot: {
            accountHolderName: bankAccount.accountHolderName,
            accountNumber: bankAccount.accountNumber,
            ifscCode: bankAccount.ifscCode,
            bankName: bankAccount.bankName,
          } as Prisma.InputJsonValue,
          razorpayPayoutId: gatewayResult.razorpayPayoutId,
        },
      });

      await tx.tuitionLedgerEntry.updateMany({
        where: { id: { in: group.entryIds } },
        data: {
          payoutStatus: LedgerPayoutStatus.PAID,
          payoutRecordId: record.id,
          paidAt: new Date(),
        },
      });
    });

    paidTeacherIds.push(group.teacherId);

    await notifyPayoutPaid(group.teacherId, group.totalAmount, group.cycleCount);
  }

  const skippedTeacherIds = skipped.map((g) => g.teacherId);

  await logActivity({
    action: "PAYOUT_MASS_PAID",
    actorRole: "ACCOUNTS",
    actorId: staffSub,
    description: `Paid ${paidTeacherIds.length} teacher(s) ₹${totalAmount.toLocaleString("en-IN")} total${
      skippedTeacherIds.length ? `; skipped ${skippedTeacherIds.length} (no bank account)` : ""
    }.`,
    metadata: { batchId: batch.id, paidTeacherIds, skippedTeacherIds, totalAmount },
  });

  return {
    batchId: batch.id,
    status: batch.status,
    paidTeacherIds,
    skippedTeacherIds,
    totalAmount,
  };
}
