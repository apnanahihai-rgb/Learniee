-- Community (Dec 2026), Part 3: enum values only. First used in code, kept apart
-- from the table migration that follows (enum rule).
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'COMMUNITY_PAYMENT';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'PAYMENT_COMMUNITY';
