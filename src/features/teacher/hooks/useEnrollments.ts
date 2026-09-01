"use client";

import { useEffect, useState } from "react";

export interface TeacherEnrollment {
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
  course: { id: string; courseTitle: string | null; subject: string | null };
  chatRoom: { id: string } | null;
}

export function useTeacherEnrollments() {
  const [enrollments, setEnrollments] = useState<TeacherEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/teacher/enrollments");
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

  async function act(
    enrollmentId: string,
    body:
      | { action: "APPROVE" }
      | { action: "REJECT"; reason?: string }
      | {
          action: "REVISE";
          note: string;
          cycleStartDate?: string;
          sessionsPerMonth?: number;
        },
  ) {
    try {
      const res = await fetch(`/api/teacher/enrollments/${enrollmentId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update enrollment");
      }

      setEnrollments((current) =>
        current.map((e) => (e.id === enrollmentId ? { ...e, ...data.enrollment } : e)),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update enrollment.");
    }
  }

  return {
    enrollments,
    loading,
    error,
    approve: (id: string) => act(id, { action: "APPROVE" }),
    reject: (id: string, reason?: string) => act(id, { action: "REJECT", reason }),
    revise: (
      id: string,
      input: { note: string; cycleStartDate?: string; sessionsPerMonth?: number },
    ) => act(id, { action: "REVISE", ...input }),
  };
}
