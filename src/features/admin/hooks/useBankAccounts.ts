"use client";

import { useEffect, useState } from "react";

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
 * Bank Account Approval (Sep 10, 2026) — Admin's queue for reviewing
 * Teacher-submitted payout bank details. Mirrors
 * `useAdminLeaveRequests` (same load/respond shape), just against
 * `/api/admin/bank-accounts` instead.
 */
export function useAdminBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/bank-accounts");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch bank accounts");
      }

      setBankAccounts(data.bankAccounts);
    } catch (err) {
      console.error(err);
      setError("Unable to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(bankAccountId: string, action: "APPROVE" | "REJECT", rejectionReason?: string) {
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
    }
  }

  return {
    bankAccounts,
    loading,
    error,
    approve: (id: string) => respond(id, "APPROVE"),
    reject: (id: string, reason: string) => respond(id, "REJECT", reason),
  };
}
