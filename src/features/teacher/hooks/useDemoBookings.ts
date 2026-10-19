"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoJoinWindowDto } from "@/features/shared/components/DemoJoinButton";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

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
    duration?: string | null;
  };
  /** When the Meet link is usable (server-computed; the link itself is never in the list). */
  joinWindow?: DemoJoinWindowDto;
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
  const [meetEnabled, setMeetEnabled] = useState(false);
  // Server time minus device time, so join buttons follow the server's clock.
  const [skewMs, setSkewMs] = useState(0);

  const reload = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/demo-bookings", {
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

  useAutoRefresh(() => reload(), { paths: ["/api/teacher/demo-bookings"] });

  return { bookings, loading, error, reload, meetEnabled, skewMs };
}
