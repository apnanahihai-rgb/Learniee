"use client";

import { useEffect, useState } from "react";

export interface LedgerEntry {
  id: string;
  enrollmentId: string;
  cycleNumber: number;
  transactionDate: string;
  teacherId: string;
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
  payoutStatus:
    | "PENDING_VERIFICATION"
    | "ON_HOLD"
    | "QUEUED_FOR_PAYMENT"
    | "PAID"
    | "REJECTED"
    | "EXPIRED"
    /** @deprecated legacy-only — old rows are backfilled to QUEUED_FOR_PAYMENT, nothing writes this anymore */
    | "APPROVED";
  verificationDeadline: string;
  verifiedByStaffSub: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  holdReason: string | null;
  adminReviewedByStaffSub: string | null;
  adminReviewedAt: string | null;
  adminDecision: "RELEASED" | "REOPENED" | "CONFIRMED_REJECTED" | null;
  paidAt: string | null;
  isOverdue: boolean;
  awaitingAdminReview: boolean;
}

export interface LedgerSummary {
  totalCyclesLedgered: number;
  pendingVerificationCount: number;
  overdueCount: number;
  awaitingAdminReviewCount: number;
  queuedForPaymentCount: number;
  totalApprovedPayout: number;
  totalPlatformProfit: number;
  totalPaidOut: number;
}

/**
 * Verify tab (Teacher Payouts, Sep 9, 2026) — Accounts' Proceed/Hold/
 * Reject on a PENDING_VERIFICATION or EXPIRED cycle. Renamed from the
 * old binary Approve/Reject: "Proceed" is the old "Approve" (now
 * meaning "queued for payment," not "paid"); Hold and Reject both
 * route to Admin instead of Reject being immediately terminal — see
 * `LedgerPayoutStatus`'s doc-comment in schema.prisma.
 */
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

  async function act(entryId: string, body: { action: "PROCEED" | "HOLD" | "REJECT"; reason?: string }) {
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
    proceed: (entryId: string) => act(entryId, { action: "PROCEED" }),
    hold: (entryId: string, reason?: string) => act(entryId, { action: "HOLD", reason }),
    reject: (entryId: string, reason?: string) => act(entryId, { action: "REJECT", reason }),
    reload: load,
  };
}
