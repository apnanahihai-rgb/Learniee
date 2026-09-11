"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { useInvoices, type InvoiceType } from "@/features/accounts/hooks/useInvoices";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TYPE_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Enrollment",
  DEMO_BOOKING_PAYMENT: "Demo booking",
  WALLET_TOPUP: "Wallet top-up",
};

/**
 * Invoices (Sep 11, 2026) — every payment made on the platform
 * (Enrollment, paid Demo booking, Wallet top-up), one row per
 * invoice, visible to Accounts and Admin. Read-only — invoices are
 * generated automatically at payment time
 * (`invoice.service.ts`/`generateInvoiceForPayment()`), there's
 * nothing to edit here.
 */
export default function InvoicesPanel() {
  const { invoices, loading, error } = useInvoices();
  const [query, setQuery] = useState("");

  const filtered = invoices.filter((inv) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.payerName.toLowerCase().includes(q) ||
      inv.payerEmail.toLowerCase().includes(q) ||
      inv.description.toLowerCase().includes(q)
    );
  });

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Invoices</h2>
          <p className="text-xs text-gray-400 mt-1">
            One receipt per completed payment — Enrollment, paid Demo, or Wallet
            top-up.
          </p>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice #, parent, description…"
            className="pl-8 pr-3 py-1.5 text-sm border rounded-full w-64 outline-none focus:border-violet-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
        <div>
          <p className="text-xs text-gray-500">Invoices Shown</p>
          <p className="text-lg font-bold text-gray-800">{filtered.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-800">{currency.format(totalAmount)}</p>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Invoice #</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading invoices…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No invoices found.
                </td>
              </tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-t align-top">
                <td className="px-3 py-2 font-mono text-xs text-gray-600">
                  {inv.invoiceNumber}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {dateFmt.format(new Date(inv.issuedAt))}
                </td>
                <td className="px-3 py-2">
                  <div>{inv.payerName}</div>
                  <div className="text-xs text-gray-400">{inv.payerEmail}</div>
                </td>
                <td className="px-3 py-2">{TYPE_LABEL[inv.type]}</td>
                <td className="px-3 py-2 whitespace-normal max-w-xs text-gray-600">
                  {inv.description}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currency.format(inv.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
