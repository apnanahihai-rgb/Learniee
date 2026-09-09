"use client";

import { useState } from "react";

import { useWallets } from "@/features/accounts/hooks/useWallets";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/**
 * Accounts/Admin-facing view of every parent's Wallet balance, plus
 * a manual credit action — the only way money moves INTO a Wallet
 * today (06-OPEN-DECISIONS.md #28: refunds credit the Wallet, never
 * the original payment method; there's no automatic
 * refund-to-wallet path yet, so this is how a refund actually gets
 * issued in practice until one exists). Deliberately no
 * debit-from-UI action here — closed-loop, no cash-out, per the
 * same decision — `debitWallet()` exists server-side but has no
 * caller anywhere yet.
 */
export default function WalletPanel() {
  const { wallets, summary, loading, error, crediting, credit } = useWallets();
  const [creditingRowId, setCreditingRowId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  function startCrediting(parentId: string) {
    setCreditingRowId(parentId);
    setAmount("");
    setReason("");
  }

  function cancelCrediting() {
    setCreditingRowId(null);
    setAmount("");
    setReason("");
  }

  async function handleCredit(parentId: string) {
    const amountNumber = Number(amount);

    if (!amountNumber || amountNumber <= 0) {
      return;
    }

    const ok = await credit(parentId, amountNumber, reason.trim() || "Manual credit");

    if (ok) {
      cancelCrediting();
    }
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Parent Wallets</h2>
        <p className="text-xs text-gray-400 mt-1">
          Closed-loop credit balances — no cash-out. Use Credit to issue a refund or
          adjustment; it lands in the parent&apos;s wallet, not their original payment
          method.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
          <div>
            <p className="text-xs text-gray-500">Parent Accounts</p>
            <p className="text-lg font-bold text-gray-800">{summary.walletCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Balance Outstanding</p>
            <p className="text-lg font-bold text-gray-800">
              {currency.format(summary.totalBalance)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3 text-right">Balance</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Loading wallets…
                </td>
              </tr>
            )}
            {!loading && wallets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No parent accounts yet.
                </td>
              </tr>
            )}
            {wallets.map((w) => (
              <tr key={w.parentId} className="border-t">
                <td className="px-3 py-2">{w.parentName}</td>
                <td className="px-3 py-2 text-gray-500">{w.email}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {currency.format(w.balance)}
                </td>
                <td className="px-3 py-2 text-right">
                  {creditingRowId === w.parentId ? (
                    <div className="flex items-center gap-1 justify-end">
                      <input
                        className="border rounded px-2 py-1 text-xs w-20"
                        placeholder="Amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <input
                        className="border rounded px-2 py-1 text-xs w-36"
                        placeholder="Reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <button
                        disabled={crediting === w.parentId}
                        onClick={() => handleCredit(w.parentId)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={cancelCrediting}
                        className="text-xs text-gray-500 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startCrediting(w.parentId)}
                      className="text-xs bg-violet-600 text-white px-3 py-1 rounded"
                    >
                      Credit
                    </button>
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
