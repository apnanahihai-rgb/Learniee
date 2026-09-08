-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "isInternationalPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "internationalSurchargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DemoBooking" ADD COLUMN "isInternationalPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "internationalSurchargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
