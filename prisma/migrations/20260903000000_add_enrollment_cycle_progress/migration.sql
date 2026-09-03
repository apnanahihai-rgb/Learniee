-- CreateEnum
CREATE TYPE "CyclePayoutStatus" AS ENUM ('IN_PROGRESS', 'READY_FOR_PAYOUT', 'RELEASED');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "sessionsCompletedInCycle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cyclesCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cyclePayoutStatus" "CyclePayoutStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "lastSessionMarkedAt" TIMESTAMP(3);
