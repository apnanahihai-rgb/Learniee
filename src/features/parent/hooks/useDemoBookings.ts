"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoJoinWindowDto } from "@/features/shared/components/DemoJoinButton";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

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
    duration?: string | null;
  };
  /** When the Meet link is usable (server-computed; the link itself is never in the list). */
  joinWindow?: DemoJoinWindowDto;
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
  const [meetEnabled, setMeetEnabled] = useState(false);
  // Server time minus device time, so join buttons follow the server's clock.
  const [skewMs, setSkewMs] = useState(0);

  const reload = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/parent/demo-bookings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo bookings.");
      }

      setBookings(data.bookings ?? []);
      setMeetEnabled(data.meetEnabled === true);
      setSkewMs(data.serverNow ? Date.parse(data.serverNow) - Date.now() : 0);
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

  useAutoRefresh(() => reload(), { paths: ["/api/parent/demo-bookings"] });

  return { bookings, loading, error, reload, meetEnabled, skewMs };
}
