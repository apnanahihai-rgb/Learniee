-- Group classes (Nov 2026): how a parent may join a group — only at the next
-- monthly batch start (MONTHLY_FIXED) or any time (ANYTIME). Additive;
-- existing courses keep NULL and the old joining behaviour.
DO $$ BEGIN
  CREATE TYPE "GroupJoinMode" AS ENUM ('MONTHLY_FIXED', 'ANYTIME');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupJoinMode" "GroupJoinMode";
