-- Additive: GST and UPI transaction charge recorded per Enrollment payment.
-- Existing rows default to 0 (they were paid before these charges existed).
ALTER TABLE "Enrollment"
  ADD COLUMN "gstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "transactionChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
