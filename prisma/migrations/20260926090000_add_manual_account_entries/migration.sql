-- Manual/historical monthly accounts import (Sep 26, 2026). Additive
-- only: new table, no column/enum touched anywhere else. Fully
-- isolated from Enrollment/EnrollmentCycle/ClassSession/
-- TuitionLedgerEntry — nothing references this table and nothing it
-- references, so `DROP TABLE "ManualAccountEntry";` (and deleting
-- this migration folder + the schema model) removes the feature
-- entirely with zero blast radius on the real cycle/ledger/payout
-- pipeline. See the model's doc-comment in schema.prisma.

-- CreateTable
CREATE TABLE "ManualAccountEntry" (
    "id" TEXT NOT NULL,
    "accountMonth" DATE NOT NULL,
    "sourceBatch" TEXT NOT NULL,
    "branch" TEXT,
    "enteredDate" DATE,
    "bankDate" DATE,
    "parentName" TEXT,
    "childName" TEXT,
    "parentPaymentStatus" TEXT,
    "numberOfMonths" DECIMAL(6,2),
    "cyclePeriodLabel" TEXT,
    "ratePerSession" DECIMAL(10,2),
    "monthlyAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "ccc" DECIMAL(6,2),
    "mcc" DECIMAL(6,2),
    "tcc" DECIMAL(6,2),
    "dueDateLabel" TEXT,
    "teacherName" TEXT,
    "subject" TEXT,
    "teacherRatePerSession" DECIMAL(10,2),
    "teacherAmount" DECIMAL(10,2),
    "profit" DECIMAL(10,2),
    "teacherPaymentStatus" TEXT,
    "meetingLink" TEXT,
    "remarks" TEXT,
    "board" TEXT,
    "grade" TEXT,
    "slot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualAccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualAccountEntry_accountMonth_idx" ON "ManualAccountEntry"("accountMonth");

-- CreateIndex
CREATE INDEX "ManualAccountEntry_sourceBatch_idx" ON "ManualAccountEntry"("sourceBatch");
