-- Excused session status + strike-waiver audit action, Reschedule/Leave Phase 2
-- (Oct 10, 2026). Additive only. The new values are NOT used in this file
-- (Postgres requires an enum value to be committed before it is used), and no
-- existing row is touched. The columns that go with them are in the next
-- migration.

-- AlterEnum
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'EXCUSED';

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'TEACHER_STRIKE_WAIVED';
