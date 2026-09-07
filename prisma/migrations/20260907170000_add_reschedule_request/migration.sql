-- CreateEnum
CREATE TYPE "RescheduleRequestedBy" AS ENUM ('PARENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING_TEACHER_APPROVAL', 'PENDING_PARENT_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "requestedBy" "RescheduleRequestedBy" NOT NULL,
    "originalScheduledDate" TIMESTAMP(3) NOT NULL,
    "originalScheduledTime" TEXT,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "proposedTime" TEXT,
    "reason" TEXT,
    "status" "RescheduleRequestStatus" NOT NULL,
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RescheduleRequest_classSessionId_idx" ON "RescheduleRequest"("classSessionId");

-- CreateIndex
CREATE INDEX "RescheduleRequest_teacherId_idx" ON "RescheduleRequest"("teacherId");

-- CreateIndex
CREATE INDEX "RescheduleRequest_parentId_idx" ON "RescheduleRequest"("parentId");

-- CreateIndex
CREATE INDEX "RescheduleRequest_status_idx" ON "RescheduleRequest"("status");

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
