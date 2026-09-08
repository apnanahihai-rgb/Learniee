-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED');

-- AlterTable
ALTER TABLE "ParentProfile" ADD COLUMN "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerParentId" TEXT NOT NULL,
    "refereeParentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardAmount" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "enrollmentId" TEXT,
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_referralCode_key" ON "ParentProfile"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeParentId_key" ON "Referral"("refereeParentId");

-- CreateIndex
CREATE INDEX "Referral_referrerParentId_idx" ON "Referral"("referrerParentId");

-- CreateIndex
CREATE INDEX "Referral_code_idx" ON "Referral"("code");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerParentId_fkey" FOREIGN KEY ("referrerParentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeParentId_fkey" FOREIGN KEY ("refereeParentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
