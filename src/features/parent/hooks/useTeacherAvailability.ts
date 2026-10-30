"use client";

import { useCallback, useEffect, useState } from "react";

import type { AvailabilitySlot } from "@/features/shared/utils/availability";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** A teacher's weekly availability, for the demo / enrollment pickers. */
export function useTeacherAvailabilityForBooking(teacherId: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teacherId) return;

    try {
      if (!isBackgroundRefresh()) setLoading(true);
      const res = await fetch(
        `/api/parent/teachers/${encodeURIComponent(teacherId)}/availability`,
        { cache: "no-store" },
      );
      const data = await res.json();

      if (res.ok) setSlots(data.slots ?? []);
    } catch (err) {
      console.error("Teacher availability load error:", err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/teachers"] });

  return { slots, loading };
}
