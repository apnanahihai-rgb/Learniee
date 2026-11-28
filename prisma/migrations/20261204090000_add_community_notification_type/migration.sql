-- Community (Dec 2026), Part 2: notification type. Enum value only; first used in code,
-- kept apart from any table change (enum rule).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_FILE_ADDED';
