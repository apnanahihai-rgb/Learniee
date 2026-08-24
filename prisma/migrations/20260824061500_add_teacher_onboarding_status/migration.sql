-- CreateEnum
CREATE TYPE "TeacherApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "approvalStatus" "TeacherApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
