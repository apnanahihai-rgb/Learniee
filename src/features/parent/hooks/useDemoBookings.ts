"use client";

import { useCallback, useEffect, useState } from "react";

export interface DemoBookingListItem {
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
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
  course: {
    id: string;
    courseTitle: string | null;
  };
}

/**
 * Loads the logged-in parent's demo bookings
 * (GET /api/parent/demo-bookings), most recent first. Used to show
 * the "Upcoming demos" list in the navbar's DemoCouponButton — the
 * component itself filters down to future-dated, still-confirmed
 * bookings.
 */
export function useDemoBookings() {
  const [bookings, setBookings] = useState<DemoBookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/parent/demo-bookings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo bookings.");
      }

      setBookings(data.bookings ?? []);
    } catch (err) {
      console.error("Load demo bookings error:", err);

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
