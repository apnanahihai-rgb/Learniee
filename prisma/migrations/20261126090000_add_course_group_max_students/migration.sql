-- Group classes (Nov 2026): how many students a group course allows.
-- Additive and nullable; existing courses stay NULL (= not a group course).
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupMaxStudents" INTEGER;
