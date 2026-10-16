"use client";

import { useAccountsLedger } from "@/features/accounts/components/layout/AccountsLedgerContext";
import TuitionLedgerPanel from "@/features/accounts/components/TuitionLedgerPanel";

/** Verify Payouts screen: wires the shell-owned ledger into the panel. */
export default function VerifyPayoutsView() {
  const ledger = useAccountsLedger();

  return (
    <TuitionLedgerPanel
      entries={ledger.entries}
      summary={ledger.summary}
      loading={ledger.loading}
      error={ledger.error}
      actingOn={ledger.actingOn}
      proceed={ledger.proceed}
      hold={ledger.hold}
      reject={ledger.reject}
    />
  );
}
