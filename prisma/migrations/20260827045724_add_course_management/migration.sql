/*
  Warnings:

  - You are about to drop the `TeacherDocuments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REJECTED', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "TeacherDocuments" DROP CONSTRAINT "TeacherDocuments_teacherId_fkey";

-- DropTable
DROP TABLE "TeacherDocuments";

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "category" TEXT,
    "timeSlot" TEXT,
    "subject" TEXT,
    "grade" TEXT,
    "board" TEXT,
    "experience" TEXT,
    "duration" TEXT,
    "type" TEXT,
    "language" TEXT,
    "frequency" TEXT,
    "courseTitle" TEXT,
    "rating" DOUBLE PRECISION,
    "objective" TEXT,
    "description" TEXT,
    "modules" TEXT,
    "courseTags" TEXT,
    "price" DECIMAL(10,2),
    "thumbnailKey" TEXT,
    "introVideoKey" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "Course_teacherId_status_idx" ON "Course"("teacherId", "status");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
