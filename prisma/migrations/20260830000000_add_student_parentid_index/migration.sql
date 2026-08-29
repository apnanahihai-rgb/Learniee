-- Every parent-facing Student query filters on parentId
-- (list/get/delete in src/features/parent/server/student.service.ts,
-- plus onboarding Step 2's initial create) but this index was
-- missing - see the code-review notes in 07-LESSONS-LEARNED.md.
-- CreateIndex
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");
