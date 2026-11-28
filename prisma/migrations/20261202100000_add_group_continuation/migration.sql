-- Group classes (Dec 2026): the Teacher's "continue this recurring group?" answer
-- per batch. Additive only: one enum, one table. See GroupContinuation in schema.prisma.

-- CreateEnum
CREATE TYPE "GroupContinuationDecision" AS ENUM ('PENDING', 'CONTINUE', 'CLOSE');

-- CreateTable
CREATE TABLE "GroupContinuation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "batchStartDate" DATE NOT NULL,
    "batchEndDate" DATE NOT NULL,
    "askFrom" DATE NOT NULL,
    "mustAnswerBy" TIMESTAMP(3) NOT NULL,
    "decision" "GroupContinuationDecision" NOT NULL DEFAULT 'PENDING',
    "askedAt" TIMESTAMP(3),
    "remindAfter" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "maxStudents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupContinuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupContinuation_courseId_batchEndDate_key" ON "GroupContinuation"("courseId", "batchEndDate");
CREATE INDEX "GroupContinuation_teacherId_decision_idx" ON "GroupContinuation"("teacherId", "decision");
CREATE INDEX "GroupContinuation_decision_askFrom_idx" ON "GroupContinuation"("decision", "askFrom");

-- AddForeignKey
ALTER TABLE "GroupContinuation" ADD CONSTRAINT "GroupContinuation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "GroupContinuation"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
