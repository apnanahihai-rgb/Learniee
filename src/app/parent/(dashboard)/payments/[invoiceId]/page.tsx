"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import type { InvoiceView } from "@/features/parent/hooks/useInvoices";
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

/** Printable single-invoice view — `window.print()` is the "download as PDF" path, no PDF-generation dependency needed. */
export default function ParentInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/parent/invoices/${invoiceId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch this invoice");
        }

        if (!cancelled) setInvoice(data.invoice);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Unable to load this invoice.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/parent/payments")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Payments
        </button>

        {invoice && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 text-sm bg-violet-600 text-white px-4 py-2 rounded-full font-medium hover:bg-violet-700"
          >
            <Printer size={15} /> Print / Save as PDF
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading…</p>
      ) : invoice ? (
        <div className="bg-white border rounded-xl p-8 shadow-sm">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold text-violet-900">Learnie</h1>
              <p className="text-xs text-gray-400 mt-1">Payment invoice</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-gray-700">{invoice.invoiceNumber}</p>
              <p className="text-xs text-gray-400 mt-1">
                {dateFmt.format(new Date(invoice.issuedAt))}
              </p>
            </div>
          </div>

          <div className="border-t border-b py-4 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-gray-800">{invoice.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            {invoice.razorpayPaymentId && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Payment reference
                </p>
                <p className="font-mono text-xs text-gray-600 break-all">
                  {invoice.razorpayPaymentId}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm font-semibold text-gray-700">Amount paid</p>
            <p className="text-2xl font-bold text-violet-900">
              {currency.format(invoice.amount)}
            </p>
          </div>
        </div>
      ) : (
        !error && <p className="text-gray-500 text-center py-8">Invoice not found.</p>
      )}
    </div>
  );
}
