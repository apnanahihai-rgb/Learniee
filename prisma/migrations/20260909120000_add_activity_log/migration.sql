-- CreateEnum
CREATE TYPE "ActivityActorRole" AS ENUM ('PARENT', 'TEACHER', 'ADMIN', 'ACCOUNTS', 'HR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM (
    'AUTH_LOGIN',
    'AUTH_LOGOUT',
    'CLASS_SESSION_COMPLETED',
    'PAYMENT_ENROLLMENT',
    'PAYMENT_DEMO_BOOKING',
    'PAYMENT_WALLET_TOPUP',
    'WALLET_CREDITED_MANUAL',
    'LEAVE_REQUEST_APPROVED',
    'LEAVE_REQUEST_REJECTED',
    'ENROLLMENT_TEACHER_APPROVED',
    'ENROLLMENT_ADMIN_APPROVED',
    'ENROLLMENT_REJECTED',
    'TEACHER_APPROVED',
    'TEACHER_REJECTED',
    'COURSE_APPROVED',
    'COURSE_REJECTED',
    'USER_DELETED',
    'GENERIC'
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "actorRole" "ActivityActorRole" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorRole_createdAt_idx" ON "ActivityLog"("actorRole", "createdAt");
