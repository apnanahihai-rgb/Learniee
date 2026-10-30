-- CreateTable
CREATE TABLE "TeacherAvailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAvailability_teacherId_dayOfWeek_idx" ON "TeacherAvailability"("teacherId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "TeacherAvailability"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();

-- Tell every already-approved Teacher to set their availability (one in-app notice each).
INSERT INTO "Notification" ("id", "recipientId", "recipientRole", "type", "title", "message", "link", "isRead", "createdAt")
SELECT gen_random_uuid()::text, t."id", 'TEACHER', 'GENERIC',
       'Set your weekly availability',
       'Add the days and times you can teach in your Calendar. Parents can only book demos and classes inside these timings, and you need them before you can create a course.',
       '/teacher/calendar?tab=availability', false, CURRENT_TIMESTAMP
FROM "Teacher" t
WHERE t."approvalStatus" = 'APPROVED'
  AND t."notificationsEnabled" = true;
