"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

import { useInvoices, type InvoiceType } from "@/features/parent/hooks/useInvoices";
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
});

const TYPE_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Enrollment",
  DEMO_BOOKING_PAYMENT: "Demo booking",
  WALLET_TOPUP: "Wallet top-up",
};

/**
 * Invoices (Sep 11, 2026) — a receipt for every real payment this
 * Parent has made (Enrollment, paid Demo booking, Wallet top-up).
 * This is the "standalone Payments-history screen" the sidebar's
 * "Payments" link already pointed at with no page behind it yet
 * (05-MODULE-SPECS-INDEX.md) — filling that gap rather than adding
 * a new nav entry.
 */
export default function ParentPaymentsPage() {
  const { invoices, loading, error } = useInvoices();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Payments</h1>
        <p className="text-gray-500 mt-1">
          Every invoice for money you've paid — Enrollments, paid demos, and Wallet
          top-ups.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading…</p>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="mx-auto mb-2 text-gray-300" size={32} />
            No invoices yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Invoice #</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {dateFmt.format(new Date(inv.issuedAt))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{TYPE_LABEL[inv.type]}</td>
                    <td className="px-4 py-2 text-gray-600">{inv.description}</td>
                    <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                      {currency.format(inv.amount)}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/parent/payments/${inv.id}`}
                        className="text-violet-700 hover:text-violet-900 font-medium"
                      >
                        View
                      </Link>
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
