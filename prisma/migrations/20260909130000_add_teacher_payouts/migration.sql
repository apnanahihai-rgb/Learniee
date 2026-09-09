-- Teacher Payouts (Sep 9, 2026)
--
-- Split into two migrations on purpose: this one only ADDs new enum
-- values and new tables/columns (safe in one transaction). The
-- follow-up migration (20260909130001_migrate_approved_ledger_rows)
-- backfills old 'APPROVED' rows to 'QUEUED_FOR_PAYMENT' — that has
-- to run in its OWN transaction, since Postgres doesn't allow a
-- freshly-added enum value to be used in the same transaction that
-- added it. `prisma migrate deploy` runs each migration folder as
-- its own transaction, so applying both in the same deploy is fine.

-- AlterEnum: LedgerPayoutStatus — 'APPROVED' becomes legacy-only
-- (same pattern as EnrollmentStatus's PENDING_APPROVAL/APPROVED —
-- see 03-DATA-MODEL.md). Nothing removed, only added.
ALTER TYPE "LedgerPayoutStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "LedgerPayoutStatus" ADD VALUE 'QUEUED_FOR_PAYMENT';
ALTER TYPE "LedgerPayoutStatus" ADD VALUE 'PAID';

-- CreateEnum
CREATE TYPE "PayoutAdminDecision" AS ENUM ('RELEASED', 'REOPENED', 'CONFIRMED_REJECTED');

-- CreateEnum
CREATE TYPE "PayoutBatchStatus" AS ENUM ('COMPLETED', 'PARTIALLY_COMPLETED');

-- CreateEnum
CREATE TYPE "PayoutRecordStatus" AS ENUM ('SUCCESS', 'SKIPPED_NO_BANK_ACCOUNT', 'FAILED');

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_ON_HOLD';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_PAID';

-- AlterEnum: ActivityAction
ALTER TYPE "ActivityAction" ADD VALUE 'PAYOUT_HELD_OR_REJECTED';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYOUT_ADMIN_DECISION';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYOUT_MASS_PAID';

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "bankName" TEXT,
    "branchName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_teacherId_key" ON "BankAccount"("teacherId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "initiatedByStaffSub" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "teacherCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRecord" (
    "id" TEXT NOT NULL,
    "payoutBatchId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "cycleCount" INTEGER NOT NULL,
    "status" "PayoutRecordStatus" NOT NULL DEFAULT 'SUCCESS',
    "bankAccountSnapshot" JSONB,
    "razorpayPayoutId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutRecord_teacherId_idx" ON "PayoutRecord"("teacherId");

-- CreateIndex
CREATE INDEX "PayoutRecord_payoutBatchId_idx" ON "PayoutRecord"("payoutBatchId");

-- AddForeignKey
ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: TuitionLedgerEntry — new payout-workflow columns
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "holdReason" TEXT;
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "adminReviewedByStaffSub" TEXT;
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "adminReviewedAt" TIMESTAMP(3);
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "adminDecision" "PayoutAdminDecision";
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "payoutRecordId" TEXT;
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TuitionLedgerEntry_payoutRecordId_idx" ON "TuitionLedgerEntry"("payoutRecordId");

-- AddForeignKey
ALTER TABLE "TuitionLedgerEntry" ADD CONSTRAINT "TuitionLedgerEntry_payoutRecordId_fkey" FOREIGN KEY ("payoutRecordId") REFERENCES "PayoutRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
