/*
  Warnings:

  - You are about to drop the column `onboardingComplete` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TeacherFileType" AS ENUM ('PROFILE_PHOTO', 'INTRO_VIDEO', 'CERTIFICATION', 'AWARD', 'DOB_PROOF', 'ADDRESS_PROOF', 'QUALIFICATION_PROOF');

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "onboardingComplete",
ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "onboardingStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "panCardNumber" TEXT;

-- DropTable
DROP TABLE "Admin";

-- CreateTable
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

-- CreateIndex
CREATE INDEX "TeacherFile_teacherId_idx" ON "TeacherFile"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherFile_teacherId_type_idx" ON "TeacherFile"("teacherId", "type");

-- AddForeignKey
ALTER TABLE "TeacherFile" ADD CONSTRAINT "TeacherFile_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
