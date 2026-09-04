"use client";

import { useEffect, useState } from "react";

export interface LedgerEntry {
  id: string;
  enrollmentId: string;
  cycleNumber: number;
  transactionDate: string;
  parentName: string;
  childName: string;
  teacherName: string;
  subject: string;
  noOfMonths: number;
  rate: number;
  monthlyRate: number;
  totalAmount: number;
  sessionsCompleted: number;
  dueDate: string;
  teacherRate: number;
  monthlyTeacherPay: number;
  profits: number;
  payoutStatus: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED" | "EXPIRED";
  verificationDeadline: string;
  verifiedByStaffSub: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  isOverdue: boolean;
}

export interface LedgerSummary {
  totalCyclesLedgered: number;
  pendingVerificationCount: number;
  overdueCount: number;
  totalApprovedPayout: number;
  totalPlatformProfit: number;
}

export function useTuitionLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts/ledger");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch the ledger");
      }

      setEntries(data.entries);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError("Unable to load the tuition ledger.");
    } finally {
      setLoading(false);
    }
  }

  async function act(entryId: string, body: { action: "APPROVE" | "REJECT"; reason?: string }) {
    try {
      setActingOn(entryId);
      const res = await fetch(`/api/accounts/ledger/${entryId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    summary,
    loading,
    error,
    actingOn,
    approve: (entryId: string) => act(entryId, { action: "APPROVE" }),
    reject: (entryId: string, reason?: string) => act(entryId, { action: "REJECT", reason }),
    reload: load,
  };
}
