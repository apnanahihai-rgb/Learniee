"use client";

import { useEffect, useState } from "react";

import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

/** Parent-side reschedule-request inbox: load, approve/reject, or withdraw. */
export function useParentRescheduleRequests() {
  const [requests, setRequests] = useState<RescheduleRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/parent/reschedule-requests");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load reschedule requests.");
      }

      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reschedule requests.");
    } finally {
      setLoading(false);
    }
  }

  async function act(requestId: string, action: "approve" | "reject" | "cancel", responseNote?: string) {
    try {
      setActingId(requestId);
      setError("");

      const res = await fetch(`/api/parent/reschedule-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseNote }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update this reschedule request.");
      }

      setRequests((current) => current.map((r) => (r.id === requestId ? data.request : r)));
      return data.request;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update this reschedule request.");
      return null;
    } finally {
      setActingId(null);
    }
  }

  return {
    requests,
    loading,
    error,
    actingId,
    approve: (id: string, note?: string) => act(id, "approve", note),
    reject: (id: string, note?: string) => act(id, "reject", note),
    cancel: (id: string) => act(id, "cancel"),
    reload: load,
  };
}
