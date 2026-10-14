"use client";

import { useEffect, useState } from "react";
import type { StaffAccount } from "@/features/admin/types/staffAccount";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export function useStaffAccounts() {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function loadAccounts() {
    if (!isBackgroundRefresh()) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff-accounts");
      if (!res.ok) throw new Error("Failed to load staff accounts.");
      const data = await res.json();
      setAccounts(data.accounts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useAutoRefresh(() => loadAccounts(), { paths: ["/api/admin/staff-accounts"] });

  async function handleDelete(account: StaffAccount) {
    const confirmed = window.confirm(
      `Permanently delete ${account.firstName} ${account.lastName} (${account.email})? This removes them from Cognito and the database. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(account.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/staff-accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleCreated(newAccount: StaffAccount) {
    setAccounts((prev) => [newAccount, ...prev]);
    // Do NOT setShowCreateForm(false) here — CreateStaffAccountForm still
    // needs to show its "Account Created" step with the one-time temp
    // password. Closing was previously happening here, which unmounted
    // the form before that screen could ever be seen. The form's own
    // "Done" button (onCancel) is what closes it now.
  }

  return {
    accounts,
    loading,
    error,
    deletingId,
    showCreateForm,
    setShowCreateForm,
    handleDelete,
    handleCreated,
    refresh: loadAccounts,
  };
}
