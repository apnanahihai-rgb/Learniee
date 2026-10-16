-- AlterTable
-- Hand-picked class dates for a cycle. Empty (the default) keeps every
-- existing cycle on its repeating-weekday schedule. Additive only.
ALTER TABLE "EnrollmentCycle" ADD COLUMN     "customDates" DATE[] NOT NULL DEFAULT ARRAY[]::DATE[];
