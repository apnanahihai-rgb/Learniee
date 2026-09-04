-- CreateEnum
CREATE TYPE "LedgerPayoutStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "TuitionLedgerEntry" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "parentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "noOfMonths" INTEGER NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "monthlyRate" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "sessionsCompleted" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "teacherRate" DECIMAL(10,2) NOT NULL,
    "monthlyTeacherPay" DECIMAL(10,2) NOT NULL,
    "profits" DECIMAL(10,2) NOT NULL,
    "payoutStatus" "LedgerPayoutStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verificationDeadline" TIMESTAMP(3) NOT NULL,
    "verifiedByStaffSub" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuitionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TuitionLedgerEntry_parentId_idx" ON "TuitionLedgerEntry"("parentId");

-- CreateIndex
CREATE INDEX "TuitionLedgerEntry_teacherId_idx" ON "TuitionLedgerEntry"("teacherId");

-- CreateIndex
CREATE INDEX "TuitionLedgerEntry_payoutStatus_idx" ON "TuitionLedgerEntry"("payoutStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TuitionLedgerEntry_enrollmentId_cycleNumber_key" ON "TuitionLedgerEntry"("enrollmentId", "cycleNumber");

-- AddForeignKey
ALTER TABLE "TuitionLedgerEntry" ADD CONSTRAINT "TuitionLedgerEntry_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
