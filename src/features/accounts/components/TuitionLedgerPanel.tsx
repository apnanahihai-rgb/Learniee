"use client";

import { useState } from "react";

import type { LedgerEntry, LedgerSummary } from "@/features/accounts/hooks/useTuitionLedger";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function StatusPill({ status, isOverdue }: { status: LedgerEntry["payoutStatus"]; isOverdue: boolean }) {
  const color = isOverdue ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

interface TuitionLedgerPanelProps {
  entries: LedgerEntry[];
  summary: LedgerSummary | null;
  loading: boolean;
  error: string;
  actingOn: string | null;
  proceed: (entryId: string) => Promise<boolean>;
  hold: (entryId: string, reason?: string) => Promise<boolean>;
  reject: (entryId: string, reason?: string) => Promise<boolean>;
}

/**
 * Accounts' Verify tab (Teacher Payouts, Sep 9, 2026) — the first of
 * the two new stops after a cycle completes, replacing the old
 * binary Approve/Reject. Only PENDING_VERIFICATION/EXPIRED rows show
 * up here; once Proceeded, Held, or Rejected a row leaves this list
 * (it's either in the Payment Queue tab or Admin's review queue).
 *
 * "Proceed" -> straight to the Payment Queue tab (skips Admin).
 * "Hold"/"Reject" -> both go to Admin for review, NOT terminal here —
 * see LedgerPayoutStatus's doc-comment in schema.prisma.
 */
export default function TuitionLedgerPanel({
  entries,
  summary,
  loading,
  error,
  actingOn,
  proceed,
  hold,
  reject,
}: TuitionLedgerPanelProps) {
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: "HOLD" | "REJECT" } | null>(null);
  const [reasonText, setReasonText] = useState("");

  const verifiable = entries.filter(
    (e) => e.payoutStatus === "PENDING_VERIFICATION" || e.payoutStatus === "EXPIRED",
  );

  async function handleConfirm() {
    if (!pendingAction) return;
    const reason = reasonText.trim() || undefined;
    const ok =
      pendingAction.kind === "HOLD" ? await hold(pendingAction.id, reason) : await reject(pendingAction.id, reason);

    if (ok) {
      setPendingAction(null);
      setReasonText("");
    }
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Verify Payouts</h2>
        <p className="text-xs text-gray-400 mt-1">
          One row per completed cycle, with a 24-hour window to decide. <strong>Proceed</strong> sends it
          straight to the Payment Queue tab for mass-pay. <strong>Hold</strong> or <strong>Reject</strong>{" "}
          send it to Admin for review instead — neither is final until Admin decides.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b bg-gray-50">
          <div>
            <p className="text-xs text-gray-500">Pending Verification</p>
            <p className="text-lg font-bold text-yellow-600">{summary.pendingVerificationCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue (&gt;24h)</p>
            <p className="text-lg font-bold text-orange-600">{summary.overdueCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Queued for Payment</p>
            <p className="text-lg font-bold text-blue-600">{summary.queuedForPaymentCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Awaiting Admin Review</p>
            <p className="text-lg font-bold text-purple-600">{summary.awaitingAdminReviewCount}</p>
          </div>
        </div>
      )}

      {error && <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Cycle Completed</th>
              <th className="px-3 py-3">Teacher</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Child</th>
              <th className="px-3 py-3">Subject</th>
              <th className="px-3 py-3 text-right">CCC (this cycle)</th>
              <th className="px-3 py-3 text-right">Teacher Pay</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && verifiable.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Nothing waiting on Verification right now.
                </td>
              </tr>
            )}
            {verifiable.map((r) => (
              <tr key={r.id} className={`border-t ${r.isOverdue ? "bg-orange-50" : ""}`}>
                <td className="px-3 py-2">{dateFmt.format(new Date(r.transactionDate))}</td>
                <td className="px-3 py-2">{r.teacherName}</td>
                <td className="px-3 py-2">{r.parentName}</td>
                <td className="px-3 py-2">{r.childName}</td>
                <td className="px-3 py-2">{r.subject}</td>
                <td className="px-3 py-2 text-right">{r.sessionsCompleted}</td>
                <td className="px-3 py-2 text-right font-medium">{currency.format(r.monthlyTeacherPay)}</td>
                <td className="px-3 py-2">
                  <StatusPill status={r.payoutStatus} isOverdue={r.isOverdue} />
                  {r.isOverdue && <div className="text-[10px] text-orange-600 mt-0.5">past 24h window</div>}
                </td>
                <td className="px-3 py-2 text-right">
                  {pendingAction?.id === r.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <input
                        className="border rounded px-2 py-1 text-xs w-32"
                        placeholder="Reason (optional)"
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        autoFocus
                      />
                      <button
                        disabled={actingOn === r.id}
                        onClick={handleConfirm}
                        className={`text-xs text-white px-2 py-1 rounded disabled:opacity-50 ${
                          pendingAction.kind === "HOLD" ? "bg-yellow-600" : "bg-red-600"
                        }`}
                      >
                        Confirm {pendingAction.kind === "HOLD" ? "Hold" : "Reject"}
                      </button>
                      <button
                        onClick={() => {
                          setPendingAction(null);
                          setReasonText("");
                        }}
                        className="text-xs text-gray-500 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        disabled={actingOn === r.id}
                        onClick={() => proceed(r.id)}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        Proceed
                      </button>
                      <button
                        disabled={actingOn === r.id}
                        onClick={() => setPendingAction({ id: r.id, kind: "HOLD" })}
                        className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
                      >
                        Hold
                      </button>
                      <button
                        disabled={actingOn === r.id}
                        onClick={() => setPendingAction({ id: r.id, kind: "REJECT" })}
                        className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
