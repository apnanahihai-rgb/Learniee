-- Community engagement (Dec 2026): enum values only. First used in code, kept apart
-- from the table migration that follows (enum rule).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_POLL_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMUNITY_POLL_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMUNITY_POLL_CLOSED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMUNITY_POLL_DELETED';
