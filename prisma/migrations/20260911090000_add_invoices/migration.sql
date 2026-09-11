-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('ENROLLMENT_PAYMENT', 'DEMO_BOOKING_PAYMENT', 'WALLET_TOPUP');

-- CreateEnum
CREATE TYPE "InvoicePayerRole" AS ENUM ('PARENT');

-- CreateSequence (backs Invoice.invoiceSeq — a real DB-level
-- autoincrement, not a counted COUNT(*) + 1, so it stays
-- collision-free under concurrent writes without a lock)
CREATE SEQUENCE "Invoice_invoiceSeq_seq" AS INTEGER START 1;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceSeq" INTEGER NOT NULL DEFAULT nextval('"Invoice_invoiceSeq_seq"'),
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "payerId" TEXT NOT NULL,
    "payerRole" "InvoicePayerRole" NOT NULL DEFAULT 'PARENT',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- AlterSequence (ties the sequence's lifecycle to the column, same
-- as Postgres's own SERIAL would do, so dropping the table drops it)
ALTER SEQUENCE "Invoice_invoiceSeq_seq" OWNED BY "Invoice"."invoiceSeq";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayOrderId_key" ON "Invoice"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayPaymentId_key" ON "Invoice"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Invoice_payerId_payerRole_createdAt_idx" ON "Invoice"("payerId", "payerRole", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_referenceType_referenceId_idx" ON "Invoice"("referenceType", "referenceId");
