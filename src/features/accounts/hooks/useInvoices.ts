"use client";

import { useEffect, useState } from "react";

export type InvoiceType = "ENROLLMENT_PAYMENT" | "DEMO_BOOKING_PAYMENT" | "WALLET_TOPUP";

export interface AccountsInvoiceRow {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  description: string;
  referenceType: string;
  referenceId: string;
  razorpayPaymentId: string | null;
  issuedAt: string;
  payerName: string;
  payerEmail: string;
}

/** Backs the Accounts/Admin dashboard's Invoices tab. */
export function useInvoices() {
  const [invoices, setInvoices] = useState<AccountsInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts/invoices");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch invoices");
      }

      setInvoices(data.invoices);
    } catch (err) {
      console.error(err);
      setError("Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  }

  return { invoices, loading, error, reload: load };
}
