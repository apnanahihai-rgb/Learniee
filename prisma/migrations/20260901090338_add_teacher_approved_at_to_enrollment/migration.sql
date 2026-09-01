-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING_TEACHER_APPROVAL';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING_PARENT_RECONFIRMATION';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING_ADMIN_APPROVAL';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "adminApprovedAt" TIMESTAMP(3),
ADD COLUMN     "pricingChangedAfterPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "revisedByTeacher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisionNote" TEXT,
ADD COLUMN     "teacherApprovedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_TEACHER_APPROVAL';

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
