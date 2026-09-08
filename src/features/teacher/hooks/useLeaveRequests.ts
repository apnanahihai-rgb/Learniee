"use client";

import { useEffect, useState } from "react";

export interface TeacherLeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminNote: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export function useTeacherLeaveRequests() {
  const [requests, setRequests] = useState<TeacherLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/teacher/leave-requests");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch leave requests");
      }

      setRequests(data.requests);
    } catch (err) {
      console.error(err);
      setError("Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(input: { startDate: string; endDate: string; reason: string }) {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/teacher/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave request");
      }

      setRequests((current) => [data.request, ...current]);
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit leave request.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(requestId: string) {
    try {
      const res = await fetch(`/api/teacher/leave-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to withdraw leave request");
      }

      setRequests((current) =>
        current.map((r) => (r.id === requestId ? { ...r, ...data.request } : r)),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to withdraw leave request.");
    }
  }

  return { requests, loading, error, submitting, submit, cancel };
}
