"use client";

import { useAdminPayoutReview } from "@/features/admin/hooks/usePayoutReview";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
};

/**
 * Admin's payout-review queue (Teacher Payouts, Sep 9, 2026) — every
 * cycle Accounts put ON_HOLD or REJECTED lands here, not anywhere
 * final, until Admin decides. Matches this app's existing "Admin has
 * final say" pattern (Enrollment dual-approval, Leave requests).
 */
export default function AdminPayoutReviewPage() {
  const { entries, loading, error, actingOn, release, reopen, confirmReject } = useAdminPayoutReview();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Payout Review</h1>
          <p className="text-gray-500 mt-1">
            {entries.length} payout{entries.length === 1 ? "" : "s"} Accounts held or rejected, waiting
            on your decision.
          </p>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">Nothing waiting on your review right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <div
                key={e.id}
                className="bg-white border rounded-xl p-6 shadow-sm flex items-start justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    {e.teacherName} — Cycle #{e.cycleNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {e.parentName} · {e.childName} · {e.subject}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    {currency.format(e.monthlyTeacherPay)} · completed {formatDate(e.transactionDate)}
                  </p>
                  {e.payoutStatus === "ON_HOLD" && e.holdReason && (
                    <p className="text-xs text-gray-400 mt-1">Accounts&apos; hold reason: {e.holdReason}</p>
                  )}
                  {e.payoutStatus === "REJECTED" && e.rejectionReason && (
                    <p className="text-xs text-gray-400 mt-1">
                      Accounts&apos; rejection reason: {e.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      STATUS_STYLES[e.payoutStatus] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {e.payoutStatus.replaceAll("_", " ")}
                  </span>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      disabled={actingOn === e.id}
                      onClick={() => release(e.id)}
                      className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Release to Payment
                    </button>
                    <button
                      disabled={actingOn === e.id}
                      onClick={() => reopen(e.id)}
                      className="text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Send Back to Accounts
                    </button>
                    <button
                      disabled={actingOn === e.id}
                      onClick={() => confirmReject(e.id)}
                      className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
