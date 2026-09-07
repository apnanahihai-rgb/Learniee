-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_razorpayOrderId_key" ON "WalletTransaction"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_razorpayPaymentId_key" ON "WalletTransaction"("razorpayPaymentId");
