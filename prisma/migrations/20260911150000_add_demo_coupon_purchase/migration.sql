-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'DEMO_COUPON_PURCHASE';

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PAYMENT_DEMO_COUPON_PURCHASE';

-- CreateTable
CREATE TABLE "DemoCouponPurchase" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoCouponPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoCouponPurchase_razorpayOrderId_key" ON "DemoCouponPurchase"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoCouponPurchase_razorpayPaymentId_key" ON "DemoCouponPurchase"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "DemoCouponPurchase_parentId_idx" ON "DemoCouponPurchase"("parentId");

-- AddForeignKey
ALTER TABLE "DemoCouponPurchase" ADD CONSTRAINT "DemoCouponPurchase_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
