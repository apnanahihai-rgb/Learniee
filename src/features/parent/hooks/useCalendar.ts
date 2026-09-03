"use client";

import { useEffect, useState } from "react";
import type { CalendarOccurrence } from "@/features/shared/types/calendar";

export type { CalendarOccurrence };

/** `month` is "YYYY-MM"; `studentId` optionally scopes to one child. */
export function useParentCalendar(month: string, studentId?: string) {
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, studentId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ month });
      if (studentId) params.set("studentId", studentId);

      const res = await fetch(`/api/parent/calendar?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch calendar");
      }

      setOccurrences(data.occurrences);
    } catch (err) {
      console.error(err);
      setError("Unable to load the calendar.");
    } finally {
      setLoading(false);
    }
  }

  return { occurrences, loading, error, reload: load };
}
