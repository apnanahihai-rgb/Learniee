-- Parent journey (Oct 19, 2026): post-demo survey table + reminder dedupe
-- stamps. Additive only.

-- CreateEnum
CREATE TYPE "DemoFeedbackRating" AS ENUM ('GREAT', 'OKAY', 'NOT_GOOD');
CREATE TYPE "DemoFeedbackFit" AS ENUM ('YES', 'SOMEWHAT', 'NO');
CREATE TYPE "DemoFeedbackIntent" AS ENUM ('ENROLL', 'NEED_TIME', 'NO');
CREATE TYPE "DemoFeedbackReason" AS ENUM ('LATE', 'UNCLEAR', 'LEVEL_MISMATCH', 'TECH_ISSUE', 'OTHER');
CREATE TYPE "DemoFeedbackOutcome" AS ENUM ('POSITIVE', 'UNDECIDED', 'NEGATIVE');

-- CreateTable
CREATE TABLE "DemoFeedback" (
    "id" TEXT NOT NULL,
    "demoBookingId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "overall" "DemoFeedbackRating" NOT NULL,
    "levelFit" "DemoFeedbackFit" NOT NULL,
    "intent" "DemoFeedbackIntent" NOT NULL,
    "reason" "DemoFeedbackReason",
    "outcome" "DemoFeedbackOutcome" NOT NULL,
    "nudge24hSentAt" TIMESTAMP(3),
    "nudge3dSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoFeedback_demoBookingId_key" ON "DemoFeedback"("demoBookingId");
CREATE INDEX "DemoFeedback_parentId_idx" ON "DemoFeedback"("parentId");
CREATE INDEX "DemoFeedback_teacherId_idx" ON "DemoFeedback"("teacherId");
CREATE INDEX "DemoFeedback_outcome_createdAt_idx" ON "DemoFeedback"("outcome", "createdAt");

-- AddForeignKey
ALTER TABLE "DemoFeedback" ADD CONSTRAINT "DemoFeedback_demoBookingId_fkey"
  FOREIGN KEY ("demoBookingId") REFERENCES "DemoBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "DemoBooking"
  ADD COLUMN "reminderDayBeforeSentAt" TIMESTAMP(3),
  ADD COLUMN "reminderHourBeforeSentAt" TIMESTAMP(3),
  ADD COLUMN "endedPromptSentAt" TIMESTAMP(3),
  ADD COLUMN "surveyOpenedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EnrollmentCycle"
  ADD COLUMN "renewalReminder7SentAt" TIMESTAMP(3),
  ADD COLUMN "renewalReminder5SentAt" TIMESTAMP(3),
  ADD COLUMN "renewalReminder2SentAt" TIMESTAMP(3),
  ADD COLUMN "cycleEndedNoticeSentAt" TIMESTAMP(3);

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "DemoFeedback"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
