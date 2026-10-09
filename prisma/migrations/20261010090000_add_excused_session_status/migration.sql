-- Excused session status, Reschedule/Leave Phase 2 Part 1 (Oct 10, 2026).
-- Additive only. The new value is not used in this file (Postgres requires an
-- enum value to be committed before it is used), and no existing row is touched.

-- AlterEnum
ALTER TYPE "ClassSessionStatus" ADD VALUE IF NOT EXISTS 'EXCUSED';
