"use client";

import { useEffect, useState } from "react";
import type { StaffAccount } from "@/features/admin/types/staffAccount";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** Reads `{ error }` from a failed response without throwing on a non-JSON body. */
async function errorFrom(res: Response, fallback: string) {
  try {
    const body = await res.json();

    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function useStaffAccounts() {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAccounts() {
    const background = isBackgroundRefresh();

    if (!background) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/staff-accounts", { cache: "no-store" });

      if (!res.ok) throw new Error(await errorFrom(res, "Failed to load staff accounts."));

      const data = await res.json();

      setAccounts(data.accounts);
    } catch (e) {
      if (!background) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoRefresh(() => loadAccounts(), { paths: ["/api/admin/staff-accounts"] });

  /**
   * Deletes the account (Cognito login + database row). The page asks for
   * confirmation first (in-page dialog). Returns an error message to show
   * in that dialog, or null when it worked.
   */
  async function handleDelete(account: StaffAccount): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/staff-accounts/${account.id}`, { method: "DELETE" });

      if (!res.ok) return await errorFrom(res, "Delete failed");

      setAccounts((prev) => prev.filter((a) => a.id !== account.id));

      return null;
    } catch (e) {
      return (e as Error).message || "Delete failed";
    }
  }

  function handleCreated(newAccount: StaffAccount) {
    setAccounts((prev) => [newAccount, ...prev.filter((a) => a.id !== newAccount.id)]);
  }

  return {
    accounts,
    loading,
    error,
    handleDelete,
    handleCreated,
    refresh: loadAccounts,
  };
}
