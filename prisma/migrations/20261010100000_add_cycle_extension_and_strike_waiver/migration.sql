-- Cycle extension for excused classes and Admin strike waiver, Reschedule/Leave
-- Phase 2 (Oct 10, 2026). Additive only: nullable columns, no backfill, no
-- existing row changes. Does not reference the enum values added in the
-- previous migration.

-- AlterTable: EnrollmentCycle
ALTER TABLE "EnrollmentCycle" ADD COLUMN "extendedDeadline" DATE;
ALTER TABLE "EnrollmentCycle" ADD COLUMN "excusedSessionCount" INTEGER;

-- AlterTable: TeacherStrike
ALTER TABLE "TeacherStrike" ADD COLUMN "waivedAt" TIMESTAMP(3);
ALTER TABLE "TeacherStrike" ADD COLUMN "waivedBySub" TEXT;
ALTER TABLE "TeacherStrike" ADD COLUMN "waivedByName" TEXT;
ALTER TABLE "TeacherStrike" ADD COLUMN "waiveReason" TEXT;
