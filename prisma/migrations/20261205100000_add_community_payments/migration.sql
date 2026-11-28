-- Community (Dec 2026), Part 3: paid communities. Additive only: one enum, one table.

-- CreateEnum
CREATE TYPE "CommunityPaymentStatus" AS ENUM ('PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "CommunityPayment" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "gstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "internationalSurchargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "transactionChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "status" "CommunityPaymentStatus" NOT NULL DEFAULT 'PAID',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPayment_razorpayOrderId_key" ON "CommunityPayment"("razorpayOrderId");
CREATE UNIQUE INDEX "CommunityPayment_razorpayPaymentId_key" ON "CommunityPayment"("razorpayPaymentId");
CREATE INDEX "CommunityPayment_communityId_paidAt_idx" ON "CommunityPayment"("communityId", "paidAt");
CREATE INDEX "CommunityPayment_parentId_communityId_idx" ON "CommunityPayment"("parentId", "communityId");

-- AddForeignKey
ALTER TABLE "CommunityPayment" ADD CONSTRAINT "CommunityPayment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityPayment" ADD CONSTRAINT "CommunityPayment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityPayment"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
