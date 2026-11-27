-- Group classes (Nov 2026): one Homework / Resource shared with every student
-- of a group becomes one row per student's Enrollment, all carrying the same
-- groupShareId so an edit or delete reaches the whole group.
-- Additive and nullable; existing rows and Individual-class rows stay NULL.
ALTER TABLE "Homework" ADD COLUMN IF NOT EXISTS "groupShareId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "groupShareId" TEXT;

CREATE INDEX IF NOT EXISTS "Homework_groupShareId_idx" ON "Homework"("groupShareId");
CREATE INDEX IF NOT EXISTS "Resource_groupShareId_idx" ON "Resource"("groupShareId");
