"use client";

import { useState } from "react";

import { useTuitionLedger, type LedgerEntry } from "@/features/accounts/hooks/useTuitionLedger";

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

function PayoutStatusPill({ status, isOverdue }: { status: LedgerEntry["payoutStatus"]; isOverdue: boolean }) {
  const color =
    status === "APPROVED"
      ? "bg-green-100 text-green-700"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700"
        : status === "EXPIRED"
          ? "bg-orange-100 text-orange-700"
          : isOverdue
            ? "bg-orange-100 text-orange-700"
            : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

/**
 * Monthly Payout Verification (08-PROJECT-KNOWLEDGE-BASE.md) — the
 * Tuition Ledger as a real, persisted table (one row per completed
 * cycle) with Accounts' 1-day Approve/Reject window now a working
 * action, not just a description in a doc.
 */
export default function TuitionLedgerPanel() {
  const { entries, summary, loading, error, actingOn, approve, reject } = useTuitionLedger();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function handleReject(entryId: string) {
    const ok = await reject(entryId, rejectReason.trim() || undefined);
    if (ok) {
      setRejectingId(null);
      setRejectReason("");
    }
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Tuition Ledger — Payout Verification</h2>
        <p className="text-xs text-gray-400 mt-1">
          One row per completed cycle. Each row starts Pending Verification with a 24-hour
          window to Approve or Reject the teacher payout for that cycle.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 border-b bg-gray-50">
          <div>
            <p className="text-xs text-gray-500">Cycles Ledgered</p>
            <p className="text-lg font-bold text-gray-800">{summary.totalCyclesLedgered}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending Verification</p>
            <p className="text-lg font-bold text-yellow-600">{summary.pendingVerificationCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue (&gt;24h)</p>
            <p className="text-lg font-bold text-orange-600">{summary.overdueCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Approved Teacher Payout</p>
            <p className="text-lg font-bold text-gray-800">{currency.format(summary.totalApprovedPayout)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Platform Profit (Approved)</p>
            <p className="text-lg font-bold text-green-700">{currency.format(summary.totalPlatformProfit)}</p>
          </div>
        </div>
      )}

      {error && <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Cycle Completed</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Child</th>
              <th className="px-3 py-3">Teacher</th>
              <th className="px-3 py-3">Subject</th>
              <th className="px-3 py-3 text-right">CCC (this cycle)</th>
              <th className="px-3 py-3 text-right">Monthly Rate</th>
              <th className="px-3 py-3 text-right">Teacher Pay</th>
              <th className="px-3 py-3 text-right">Profits</th>
              <th className="px-3 py-3">Payout Status</th>
              <th className="px-3 py-3">Verify By</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                  Loading ledger…
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                  No cycles have completed yet — rows appear here once a Teacher marks a cycle&apos;s
                  final session complete.
                </td>
              </tr>
            )}
            {entries.map((r) => (
              <tr key={r.id} className={`border-t ${r.isOverdue ? "bg-orange-50" : ""}`}>
                <td className="px-3 py-2">{dateFmt.format(new Date(r.transactionDate))}</td>
                <td className="px-3 py-2">{r.parentName}</td>
                <td className="px-3 py-2">{r.childName}</td>
                <td className="px-3 py-2">{r.teacherName}</td>
                <td className="px-3 py-2">{r.subject}</td>
                <td className="px-3 py-2 text-right">{r.sessionsCompleted}</td>
                <td className="px-3 py-2 text-right">{currency.format(r.monthlyRate)}</td>
                <td className="px-3 py-2 text-right font-medium">{currency.format(r.monthlyTeacherPay)}</td>
                <td className="px-3 py-2 text-right text-green-700">{currency.format(r.profits)}</td>
                <td className="px-3 py-2">
                  <PayoutStatusPill status={r.payoutStatus} isOverdue={r.isOverdue} />
                  {r.isOverdue && <div className="text-[10px] text-orange-600 mt-0.5">past 24h window</div>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {dateFmt.format(new Date(r.verificationDeadline))}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.payoutStatus === "PENDING_VERIFICATION" || r.payoutStatus === "EXPIRED" ? (
                    rejectingId === r.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          className="border rounded px-2 py-1 text-xs w-32"
                          placeholder="Reason (optional)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button
                          disabled={actingOn === r.id}
                          onClick={() => handleReject(r.id)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
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
                          onClick={() => approve(r.id)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={actingOn === r.id}
                          onClick={() => setRejectingId(r.id)}
                          className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-gray-400">
                      {r.payoutStatus === "APPROVED" ? "Paid out" : "Rejected"}
                      {r.rejectionReason ? ` — ${r.rejectionReason}` : ""}
                    </span>
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
