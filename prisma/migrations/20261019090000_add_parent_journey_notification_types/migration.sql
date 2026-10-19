-- Parent journey (Oct 19, 2026): new notification types. Enum additions only;
-- first use is in application code, never in this migration.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEMO_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEMO_SURVEY_PROMPT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEMO_SURVEY_NUDGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RENEWAL_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CYCLE_ENDED';
