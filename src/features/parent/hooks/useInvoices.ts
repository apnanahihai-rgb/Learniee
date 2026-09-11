"use client";

import { useEffect, useState } from "react";

export type InvoiceType = "ENROLLMENT_PAYMENT" | "DEMO_BOOKING_PAYMENT" | "WALLET_TOPUP";

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  description: string;
  referenceType: string;
  referenceId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  issuedAt: string;
  createdAt: string;
}

/** Backs `/parent/payments` — the logged-in parent's own invoices. */
export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/parent/invoices");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch your invoices");
      }

      setInvoices(data.invoices);
    } catch (err) {
      console.error(err);
      setError("Unable to load your invoices.");
    } finally {
      setLoading(false);
    }
  }

  return { invoices, loading, error, reload: load };
}
