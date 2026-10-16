"use client";

import { createContext, useContext } from "react";

import type { useTuitionLedger } from "@/features/accounts/hooks/useTuitionLedger";

export type AccountsLedgerState = ReturnType<typeof useTuitionLedger>;

export const AccountsLedgerContext = createContext<AccountsLedgerState | null>(null);

/**
 * The payout-verification ledger is loaded once by `AccountsShell`, so the
 * sidebar badges, the Overview counts and the Verify Payouts screen all read
 * (and act on) the same data instead of fetching it three times.
 */
export function useAccountsLedger(): AccountsLedgerState {
  const value = useContext(AccountsLedgerContext);

  if (!value) {
    throw new Error("useAccountsLedger must be used inside AccountsShell.");
  }

  return value;
}
