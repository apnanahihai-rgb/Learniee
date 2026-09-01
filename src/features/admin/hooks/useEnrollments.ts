"use client";

import { useEffect, useState } from "react";

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
  revisedByTeacher: boolean;
  revisionNote: string | null;
  pricingChangedAfterPayment: boolean;
  student: { id: string; firstName: string; visibleName: string | null };
  parent: { id: string; firstName: string; lastName: string; email: string; phone: string };
  teacher: { id: string; firstName: string; lastName: string; visibleName: string | null };
  course: { id: string; courseTitle: string | null };
  chatRoom: { id: string } | null;
}

export function useAdminEnrollments() {
  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/enrollments");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch enrollments");
      }

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
  ) {
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
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update enrollment.");
    }
  }

  return { enrollments, loading, error, updateApproval };
}
