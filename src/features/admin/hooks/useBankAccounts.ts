"use client";

import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface AdminBankAccount {
  id: string;
  teacherId: string;
  teacherName: string;
  email: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  branchName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin's bank-account queue (Admin design 05).
 * Data: GET /api/admin/bank-accounts (verified Admin auth).
 * Decisions: PATCH /api/admin/bank-accounts/[id]
 * ({ action: "APPROVE" | "REJECT", rejectionReason? }), which also
 * notifies the Teacher and writes the Activity Log entry. Refreshes
 * live when the data changes elsewhere.
 */
export function useAdminBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useAutoRefresh(() => load(), { paths: ["/api/admin/bank-accounts"] });

  async function load() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch("/api/admin/bank-accounts");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch bank accounts");
      }

      setError("");
      setBankAccounts(data.bankAccounts);
    } catch (err) {
      console.error(err);
      setError("Unable to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(
    bankAccountId: string,
    action: "APPROVE" | "REJECT",
    rejectionReason?: string,
  ): Promise<boolean> {
    if (busyId) return false;

    setBusyId(bankAccountId);
    setError("");

    try {
      const res = await fetch(`/api/admin/bank-accounts/${bankAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update bank account");
      }

      setBankAccounts((current) =>
        current.map((b) => (b.id === bankAccountId ? { ...b, ...data.bankAccount } : b)),
      );

      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update bank account.");

      return false;
    } finally {
      setBusyId(null);
    }
  }

  return {
    bankAccounts,
    loading,
    error,
    busyId,
    approve: (id: string) => respond(id, "APPROVE"),
    reject: (id: string, reason: string) => respond(id, "REJECT", reason),
  };
}
