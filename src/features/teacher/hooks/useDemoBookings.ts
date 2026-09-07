"use client";

import { useCallback, useEffect, useState } from "react";

export interface TeacherDemoBookingListItem {
  id: string;
  subject: string;
  status: string;
  isPaid: boolean;
  amount: string | null;
  scheduledAt: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    visibleName: string | null;
  };
  course: {
    id: string;
    courseTitle: string | null;
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  } | null;
}

/**
 * Loads the logged-in teacher's demo bookings
 * (GET /api/teacher/demo-bookings), most recent first. Mirrors
 * `useDemoBookings` on the Parent side.
 */
export function useTeacherDemoBookings() {
  const [bookings, setBookings] = useState<TeacherDemoBookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/demo-bookings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo bookings.");
      }

      setBookings(data.bookings ?? []);
    } catch (err) {
      console.error("Load teacher demo bookings error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load demo bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, loading, error, reload };
}
