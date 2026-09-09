-- Teacher Payouts (Sep 9, 2026), part 2 — must run in its own
-- transaction, after the enum values added in
-- 20260909130000_add_teacher_payouts have committed.
--
-- Any TuitionLedgerEntry that Accounts already approved under the
-- old two-state flow (PENDING_VERIFICATION -> APPROVED) was, in
-- practice, "ready to pay, not yet paid" — that's exactly what
-- QUEUED_FOR_PAYMENT now means, so this is a like-for-like backfill,
-- not a behavior change. These rows will now show up in Accounts'
-- new Payment Queue tab, grouped by teacher, same as anything newly
-- verified going forward.
UPDATE "TuitionLedgerEntry"
SET "payoutStatus" = 'QUEUED_FOR_PAYMENT'
WHERE "payoutStatus" = 'APPROVED';
