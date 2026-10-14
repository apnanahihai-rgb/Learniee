"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** Data hooks for refund requests: one for the Parent, one for Admin. */

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data as T;
}

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/* ------------------------------ Parent ------------------------------ */

export interface ParentRefundRequest {
  id: string;
  invoiceId: string;
  status: RefundStatus;
  reason: string;
  approvedAmount: number | null;
  adminNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

/** Backs the "Request refund" button on the Parent Payments page. */
export function useParentRefundRequests() {
  const [requests, setRequests] = useState<ParentRefundRequest[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await call<{ requests: ParentRefundRequest[] }>("/api/parent/refund-requests");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your refund requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/refund-requests"] });

  async function submit(invoiceId: string, reason: string) {
    setError("");
    setSubmitting(true);

    try {
      await call("/api/parent/refund-requests", { method: "POST", body: JSON.stringify({ invoiceId, reason }) });
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your request.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    setError("");

    try {
      await call(`/api/parent/refund-requests/${id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel this request.");
    }

    await load();
  }

  return { requests, error, submitting, submit, cancel };
}

/* ------------------------------ Admin ------------------------------ */

export interface AdminRefundRequest {
  id: string;
  status: RefundStatus;
  reason: string;
  parentName: string;
  parentEmail: string;
  invoiceNumber: string;
  description: string;
  invoiceType: string;
  paidAt: string;
  amountPaid: number;
  remainingRefundable: number;
  approvedAmount: number | null;
  adminNote: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export function useAdminRefundRequests() {
  const [requests, setRequests] = useState<AdminRefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      const data = await call<{ requests: AdminRefundRequest[] }>("/api/admin/refund-requests");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load refund requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/admin/refund-requests"] });

  async function decide(
    id: string,
    action: "APPROVE" | "REJECT",
    extra: { approvedAmount?: number; adminNote?: string },
  ) {
    setError("");
    setNotice("");
    setBusyId(id);

    try {
      const result = await call<{ notices?: string[] }>(`/api/admin/refund-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...extra }),
      });
      setNotice((result.notices ?? []).join(" "));
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update this request.");
      await load();
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { requests, loading, error, notice, busyId, decide };
}
