-- Account Settings / Notification Preferences (Sep 10, 2026)
--
-- Backs the new `/parent/settings` and `/teacher/settings` pages —
-- an MVP-minimal master toggle per recipient (no per-category/type
-- toggles yet, that fuller shape is still Phase 2, see
-- 06-OPEN-DECISIONS.md #32). Checked in notification.service.ts
-- before any Notification row is written; defaults to true so
-- existing rows keep receiving notifications exactly as before this
-- migration.

-- AlterTable: ParentProfile
ALTER TABLE "ParentProfile" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Teacher
ALTER TABLE "Teacher" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
