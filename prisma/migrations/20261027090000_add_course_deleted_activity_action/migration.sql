-- Admin "Lowest rated" screen (Oct 27, 2026). Additive only: one audit action.
-- The new value is NOT used in this file (Postgres requires an enum value to be
-- committed before it is used); the first use is in application code.

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COURSE_DELETED';
