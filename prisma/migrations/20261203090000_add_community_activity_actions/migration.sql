-- Community (Dec 2026): Activity Log actions. Enum values only; first used in code,
-- kept apart from the tables migration (enum rule).
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMUNITY_FILE_DELETED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMUNITY_MEMBER_REMOVED';
