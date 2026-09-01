/*
  Warnings:

  - A unique constraint covering the columns `[razorpayOrderId]` on the table `DemoBooking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayPaymentId]` on the table `DemoBooking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayOrderId]` on the table `Enrollment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayPaymentId]` on the table `Enrollment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountPaid` to the `Enrollment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `razorpayOrderId` to the `Enrollment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `razorpayPaymentId` to the `Enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DemoBooking" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "razorpayOrderId" TEXT NOT NULL,
ADD COLUMN     "razorpayPaymentId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DemoBooking_razorpayOrderId_key" ON "DemoBooking"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoBooking_razorpayPaymentId_key" ON "DemoBooking"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_razorpayOrderId_key" ON "Enrollment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_razorpayPaymentId_key" ON "Enrollment"("razorpayPaymentId");
