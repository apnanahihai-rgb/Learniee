CREATE TYPE "TeacherFileType" AS ENUM (
  'PROFILE_PHOTO',
  'INTRO_VIDEO',
  'CERTIFICATION',
  'AWARD',
  'DOB_PROOF',
  'ADDRESS_PROOF',
  'QUALIFICATION_PROOF'
);

CREATE TABLE "TeacherFile" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "type" "TeacherFileType" NOT NULL,
  "s3Key" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherFile_teacherId_idx"
ON "TeacherFile"("teacherId");

CREATE INDEX "TeacherFile_teacherId_type_idx"
ON "TeacherFile"("teacherId", "type");

ALTER TABLE "TeacherFile"
ADD CONSTRAINT "TeacherFile_teacherId_fkey"
FOREIGN KEY ("teacherId")
REFERENCES "Teacher"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;