-- Group classes (Nov 2026): group type (one-time / recurring weekly or monthly),
-- mid-way joining, registration window and age range. Additive; existing
-- courses keep NULL.
DO $$ BEGIN
  CREATE TYPE "GroupKind" AS ENUM ('ONE_TIME', 'RECURRING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupRecurrence" AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupKind" "GroupKind";
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupRecurrence" "GroupRecurrence";
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupAllowMidwayJoin" BOOLEAN;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupRegStartDate" DATE;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupRegEndDate" DATE;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupAgeMin" INTEGER;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupAgeMax" INTEGER;
