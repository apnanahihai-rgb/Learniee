"use client";

import { useEffect, useState } from "react";

export interface AdminPayoutReviewEntry {
  id: string;
  cycleNumber: number;
  transactionDate: string;
  teacherId: string;
  teacherName: string;
  parentName: string;
  childName: string;
  subject: string;
  monthlyTeacherPay: number;
  payoutStatus: "ON_HOLD" | "REJECTED";
  holdReason: string | null;
  rejectionReason: string | null;
  verifiedByStaffSub: string | null;
  verifiedAt: string | null;
}

/**
 * Admin's payout-review queue (Teacher Payouts, Sep 9, 2026) — every
 * cycle Accounts put ON_HOLD or REJECTED, awaiting Admin's
 * Release/Reopen/Confirm-Reject decision.
 */
export function useAdminPayoutReview() {
  const [entries, setEntries] = useState<AdminPayoutReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payout-review");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the payout review queue");
      }

      setEntries(data.entries);
    } catch (err) {
      console.error(err);
      setError("Unable to load the payout review queue.");
    } finally {
      setLoading(false);
    }
  }

  async function act(entryId: string, action: "RELEASE" | "REOPEN" | "CONFIRM_REJECT") {
    try {
      setActingOn(entryId);
      const res = await fetch(`/api/admin/payout-review/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update this payout");
      }

      await load();
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update this payout.");
      return false;
    } finally {
      setActingOn(null);
    }
  }

  return {
    entries,
    loading,
    error,
    actingOn,
    release: (entryId: string) => act(entryId, "RELEASE"),
    reopen: (entryId: string) => act(entryId, "REOPEN"),
    confirmReject: (entryId: string) => act(entryId, "CONFIRM_REJECT"),
  };
}
