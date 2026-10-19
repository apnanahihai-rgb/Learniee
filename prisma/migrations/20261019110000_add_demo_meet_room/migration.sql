-- Demo Meet room + teacher reminders + join stamps (Oct 19, 2026).
-- Additive only: nullable columns and two indexes on "DemoBooking".
-- No enum changes (teacher reminders reuse the DEMO_REMINDER type).

ALTER TABLE "DemoBooking"
  ADD COLUMN "teacherReminderDayBeforeSentAt" TIMESTAMP(3),
  ADD COLUMN "teacherReminderHourBeforeSentAt" TIMESTAMP(3),
  ADD COLUMN "meetSpaceName" TEXT,
  ADD COLUMN "meetingUri" TEXT,
  ADD COLUMN "meetOrganizerEmail" TEXT,
  ADD COLUMN "meetOrganizerAssignedAt" TIMESTAMP(3),
  ADD COLUMN "meetCohostEmail" TEXT,
  ADD COLUMN "meetCohostConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "teacherJoinedAt" TIMESTAMP(3),
  ADD COLUMN "parentJoinedAt" TIMESTAMP(3);

CREATE INDEX "DemoBooking_status_scheduledAt_idx" ON "DemoBooking"("status", "scheduledAt");
CREATE INDEX "DemoBooking_meetOrganizerEmail_meetOrganizerAssignedAt_idx"
  ON "DemoBooking"("meetOrganizerEmail", "meetOrganizerAssignedAt");
