-- Group classes (Nov 2026): price per cycle, weekly days + time, and
-- time-bound / open mode. Additive; existing courses keep NULL / empty values.
DO $$ BEGIN
  CREATE TYPE "GroupClassMode" AS ENUM ('TIME_BOUND', 'OPEN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupPricePerCycle" DECIMAL(10,2);
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupTime" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupMode" "GroupClassMode";
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupStartDate" DATE;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupEndDate" DATE;
