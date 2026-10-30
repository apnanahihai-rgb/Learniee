"use client";

import { useCallback, useEffect, useState } from "react";

import type { AvailabilitySlot } from "@/features/shared/utils/availability";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** The logged-in Teacher's weekly availability: load + replace-the-week save. */
export function useTeacherAvailability() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      const res = await fetch("/api/teacher/availability", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load availability.");

      setSlots(data.slots ?? []);
      setLoadFailed(false);
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/teacher/availability"] });

  async function save(next: AvailabilitySlot[]): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/teacher/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: next }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save availability.");

      setSlots(data.slots ?? next);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save availability.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { slots, loading, loadFailed, saving, error, save, reload: load };
}
