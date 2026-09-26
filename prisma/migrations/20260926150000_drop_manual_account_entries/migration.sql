-- Rollback of the "manual accounts" experiment (20260926090000_add_manual_account_entries).
-- ManualAccountEntry was an isolated, no-FK table for a one-off manual/
-- historical bookkeeping import — nothing else in the app reads or writes
-- it, so dropping it cannot cascade into any real Enrollment/Cycle/Session/
-- Ledger data. Forward-only per project convention: this is a new migration
-- that drops the table, not an edit to the migration that created it.

DROP TABLE IF EXISTS "ManualAccountEntry";
