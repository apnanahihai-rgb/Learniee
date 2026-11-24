"use client";

import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface AdminEnrollment {
  id: string;
  status: string;
  sessionsPerMonth: number;
  noOfMonths: number;
  monthlyRate: string;
  totalAmount: string;
  amountPaid: string;
  cycleStartDate: string;
  dueDate: string;
  /** When the parent booked it; drives the "Waiting N days" tag. */
  createdAt: string;
  revisedByTeacher: boolean;
  revisionNote: string | null;
  pricingChangedAfterPayment: boolean;
  student: { id: string; firstName: string; visibleName: string | null };
  parent: { id: string; firstName: string; lastName: string; email: string; phone: string };
  teacher: { id: string; firstName: string; lastName: string; visibleName: string | null };
  course: { id: string; courseTitle: string | null };
  chatRoom: { id: string } | null;
}

/**
 * Admin enrollment queue.
 * Data: GET /api/admin/enrollments (verified Admin auth).
 * Decisions: PATCH /api/admin/enrollments/[id]/approval
 * ({ action: "APPROVE" | "REJECT", reason? }), which also writes the
 * Activity Log entry. Refreshes live when the data changes elsewhere.
 */
export function useAdminEnrollments() {
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useAutoRefresh(() => load(), { paths: ["/api/admin/enrollments"] });

  async function load() {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch("/api/admin/enrollments");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch enrollments");
      }

      setError("");
      setEnrollments(data.enrollments);
    } catch (err) {
      console.error(err);
      setError("Unable to load enrollments.");
    } finally {
      setLoading(false);
    }
  }

  async function updateApproval(
    enrollmentId: string,
    action: "APPROVE" | "REJECT",
    reason?: string,
  ): Promise<boolean> {
    if (busyId) return false;

    setBusyId(enrollmentId);
    setError("");

    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update enrollment");
      }

      // Both outcomes leave the admin queue — remove it either way.
      setEnrollments((current) => current.filter((e) => e.id !== enrollmentId));

      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update enrollment.");

      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { enrollments, loading, error, busyId, updateApproval };
}
