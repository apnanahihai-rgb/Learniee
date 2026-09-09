-- Parent/Teacher Complaints & Support (added Sep 10, 2026).
-- Fills the long-standing "Complaints: not built" gap flagged since
-- Week 6 (01-PROJECT-STATUS.md / 04-BUILD-PLAN-TIMELINE.md).

-- CreateEnum
CREATE TYPE "ComplainantRole" AS ENUM ('PARENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'COMPLAINT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLAINT_RESOLVED';

-- AlterEnum: ActivityAction
ALTER TYPE "ActivityAction" ADD VALUE 'COMPLAINT_STATUS_UPDATED';

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "raiserId" TEXT NOT NULL,
    "raiserRole" "ComplainantRole" NOT NULL,
    "raiserName" TEXT,
    "raiserEmail" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_raiserId_raiserRole_idx" ON "Complaint"("raiserId", "raiserRole");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
