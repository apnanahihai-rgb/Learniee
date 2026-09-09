-- CreateEnum
CREATE TYPE "NotificationRecipientRole" AS ENUM ('PARENT', 'TEACHER', 'ADMIN', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'ENROLLMENT_CREATED',
    'ENROLLMENT_TEACHER_APPROVED',
    'ENROLLMENT_REVISION_PROPOSED',
    'ENROLLMENT_REVISION_CONFIRMED',
    'ENROLLMENT_REVISION_DECLINED',
    'ENROLLMENT_REJECTED',
    'ENROLLMENT_ACTIVATED',
    'DEMO_BOOKED',
    'CLASS_SESSION_REMINDER',
    'CLASS_SESSION_COMPLETED',
    'CYCLE_PAYOUT_READY',
    'RESCHEDULE_PROPOSED',
    'RESCHEDULE_APPROVED',
    'RESCHEDULE_REJECTED',
    'LEAVE_REQUEST_SUBMITTED',
    'LEAVE_REQUEST_APPROVED',
    'LEAVE_REQUEST_REJECTED',
    'HOMEWORK_ASSIGNED',
    'HOMEWORK_SUBMITTED',
    'HOMEWORK_GRADED',
    'COURSE_APPROVED',
    'COURSE_REJECTED',
    'COURSE_PUBLISHED_MATCH',
    'CHAT_MESSAGE',
    'WALLET_CREDITED',
    'TEACHER_APPROVED',
    'TEACHER_REJECTED',
    'GENERIC'
);

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientRole" "NotificationRecipientRole" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_recipientRole_createdAt_idx" ON "Notification"("recipientId", "recipientRole", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_recipientRole_isRead_idx" ON "Notification"("recipientId", "recipientRole", "isRead");
