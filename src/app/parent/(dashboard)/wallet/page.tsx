"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useWallet } from "@/features/parent/hooks/useWallet";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ParentWalletPage() {
  const { balance, transactions, loading, error, addingMoney, addMoney } = useWallet();
  const [amountInput, setAmountInput] = useState("");
  const [notice, setNotice] = useState("");

  async function handleAddMoney() {
    const amount = Number(amountInput);
    setNotice("");

    const result = await addMoney(amount);

    setNotice(result.message);

    if (result.ok) {
      setAmountInput("");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Wallet</h1>
        <p className="text-gray-500 mt-1">
          Credits issued to your account — refunds and adjustments land here, not back
          on your original payment method.
        </p>
      </div>

      {error && (
        <ErrorBanner>{error}</ErrorBanner>
      )}

      <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
        <p className="text-xs text-gray-500">Available balance</p>
        <p className="text-3xl font-bold text-violet-900 mt-1 mb-4">
          {loading ? "…" : currency.format(balance)}
        </p>

        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              ₹
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              placeholder="Amount to add"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full h-10 rounded-full border-2 border-violet-100 bg-violet-50/50 pl-7 pr-3 text-sm outline-none focus:border-violet-400 focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={handleAddMoney}
            disabled={addingMoney || !amountInput}
            className="flex items-center gap-1 h-10 px-4 rounded-full bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-60 flex-shrink-0"
          >
            <Plus size={15} />
            {addingMoney ? "Please wait..." : "Add money"}
          </button>
        </div>

        {notice && <p className="text-xs text-amber-600 mt-2">{notice}</p>}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-800">Transaction history</h2>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No wallet activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {dateFmt.format(new Date(t.createdAt))}
                    </td>
                    <td className="px-4 py-2">{t.reason}</td>
                    <td
                      className={`px-4 py-2 text-right font-medium whitespace-nowrap ${
                        t.type === "CREDIT" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {t.type === "CREDIT" ? "+" : "-"}
                      {currency.format(t.amount)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">
                      {currency.format(t.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
