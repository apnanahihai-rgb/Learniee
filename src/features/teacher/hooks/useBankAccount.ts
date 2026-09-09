"use client";

import { useEffect, useState } from "react";

export interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  branchName: string | null;
  updatedAt: string;
}

export interface BankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  branchName?: string;
}

/**
 * Teacher's own payout bank details (Teacher Payouts, Sep 9, 2026) —
 * previously a Month-2, not-MVP entity (03-DATA-MODEL.md). Needed
 * before Accounts can mass-pay this teacher from the Payment Queue.
 */
export function useBankAccount() {
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/bank-account");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load bank details");
      }

      setBankAccount(data.bankAccount);
    } catch (err) {
      console.error(err);
      setError("Unable to load your bank details.");
    } finally {
      setLoading(false);
    }
  }

  async function save(input: BankAccountInput) {
    try {
      setSaving(true);
      setError("");
      setSuccess(false);

      const res = await fetch("/api/teacher/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save bank details");
      }

      setBankAccount(data.bankAccount);
      setSuccess(true);
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save bank details.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { bankAccount, loading, saving, error, success, save };
}
