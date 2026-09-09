"use client";

import { useState } from "react";

import { useAdminBankAccounts } from "@/features/admin/hooks/useBankAccounts";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { getBankAccountStatusStyle } from "@/features/shared/utils/bankAccountStatus";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Masks all but the last 4 digits — the underlying value is still
// plain text at rest (06-OPEN-DECISIONS.md #46, unresolved), but
// there's no reason for this list view to display the full number
// when only the last 4 are ever needed to sanity-check a submission.
function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `••••${accountNumber.slice(-4)}`;
}

/**
 * Admin's "Bank Account Approvals" queue (Sep 10, 2026). Every
 * Teacher-submitted `BankAccount` — first-time or a re-edit — lands
 * here as PENDING until approved/rejected. Only an APPROVED row is
 * usable for a payout (see `listPaymentQueueGroupedByTeacher` in
 * teacherPayout.service.ts). Mirrors `/admin/leave-requests`'s layout.
 */
export default function AdminBankAccountsPage() {
  const { bankAccounts, loading, error, approve, reject } = useAdminBankAccounts();
  const [showResolved, setShowResolved] = useState(false);

  const visible = showResolved
    ? bankAccounts
    : bankAccounts.filter((b) => b.status === "PENDING");
  const pendingCount = bankAccounts.filter((b) => b.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Bank Account Approvals</h1>
            <p className="text-gray-500 mt-1">
              {pendingCount} submission{pendingCount === 1 ? "" : "s"} waiting on you.
            </p>
          </div>

          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
          >
            {showResolved ? "Show pending only" : "Show all history"}
          </button>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-500">Loading bank accounts...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {showResolved ? "No bank account submissions yet." : "Nothing waiting on your approval."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((b) => (
              <div
                key={b.id}
                className="bg-white border rounded-xl p-6 shadow-sm flex items-start justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-800">{b.teacherName}</p>
                  <p className="text-sm text-gray-500">{b.email}</p>

                  <dl className="text-sm text-gray-700 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <dt className="text-gray-400 text-xs">Account holder</dt>
                      <dd>{b.accountHolderName}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400 text-xs">Account number</dt>
                      <dd>{maskAccountNumber(b.accountNumber)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400 text-xs">IFSC</dt>
                      <dd>{b.ifscCode}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400 text-xs">Bank</dt>
                      <dd>{b.bankName || "—"}{b.branchName ? `, ${b.branchName}` : ""}</dd>
                    </div>
                  </dl>

                  <p className="text-xs text-gray-400 mt-2">
                    Submitted {formatDate(b.createdAt)}
                    {b.reviewedAt && ` · Reviewed ${formatDate(b.reviewedAt)}`}
                  </p>

                  {b.rejectionReason && (
                    <p className="text-xs text-red-500 mt-1">Rejection reason: {b.rejectionReason}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      getBankAccountStatusStyle(b.status)
                    }`}
                  >
                    {b.status}
                  </span>

                  {b.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(b.id)}
                        className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt("Reason for rejecting these bank details:");
                          if (reason && reason.trim()) reject(b.id, reason.trim());
                        }}
                        className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
