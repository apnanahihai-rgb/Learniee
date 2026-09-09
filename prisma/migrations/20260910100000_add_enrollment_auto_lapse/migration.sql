-- Enrollment auto-lapse (Sep 10, 2026).
-- Resolves 06-OPEN-DECISIONS.md #27 / 03-DATA-MODEL.md "Still not
-- modeled: a due-date ReminderJob" note's sibling gap — the decided
-- rule (an ACTIVE Enrollment with no lecture conducted for 45 days
-- flips to LAPSED) had a status value and schema support
-- (`Enrollment.lastClassAt`) since Sep 1, but nothing actually wrote
-- LAPSED until this migration's application code.
-- No new tables/columns — only two new enum values for the
-- notification and activity-log trail this now produces.

-- AlterEnum: NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_LAPSED';

-- AlterEnum: ActivityAction
ALTER TYPE "ActivityAction" ADD VALUE 'ENROLLMENT_AUTO_LAPSED';
