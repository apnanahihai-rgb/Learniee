-- Bank Account Approval (Sep 10, 2026)
--
-- `BankAccount` (added Sep 9, 2026 for Teacher Payouts) previously had
-- no review step at all — a Teacher's self-edited details were usable
-- for mass-pay the moment they were saved. This adds an
-- Admin-approval gate: every create AND every edit resets `status`
-- to PENDING, and only an APPROVED row is treated as payable (see
-- `listPaymentQueueGroupedByTeacher` in teacherPayout.service.ts).
--
-- NOTE for whoever applies this: any `BankAccount` rows that already
-- exist in the live DB will come out of this migration as PENDING —
-- there was no prior "approved" concept to preserve, and previously
-- everything was implicitly trusted. Check /admin/bank-accounts after
-- applying; any teacher who was already payable will need one
-- Approve click before their next payout goes through.

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: BankAccount
ALTER TABLE "BankAccount" ADD COLUMN "status" "BankAccountStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "BankAccount" ADD COLUMN "reviewedByStaffSub" TEXT;
ALTER TABLE "BankAccount" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "BankAccount" ADD COLUMN "rejectionReason" TEXT;

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'BANK_ACCOUNT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'BANK_ACCOUNT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'BANK_ACCOUNT_REJECTED';

-- AlterEnum: ActivityAction
ALTER TYPE "ActivityAction" ADD VALUE 'BANK_ACCOUNT_APPROVAL_DECISION';
