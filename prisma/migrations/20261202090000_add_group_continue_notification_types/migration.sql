-- Group classes (Dec 2026): continue / renew of a recurring group. Enum additions
-- only; first use is in application code, never in this migration.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_CONTINUE_PROMPT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_CONTINUE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_RENEWAL_OPEN';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_CLOSING';
