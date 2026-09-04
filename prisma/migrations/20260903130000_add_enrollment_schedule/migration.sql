-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "scheduleDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "scheduleTime" TEXT;
