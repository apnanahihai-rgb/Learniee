"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

/**
 * Sidebar badge numbers. Best-effort: a failed request just leaves the
 * badges off, it never blocks the page behind them. Refreshes when the
 * tab regains focus, periodically, and after any change.
 */
export function useAdminQueueCounts() {
  const [counts, setCounts] = useState<AdminQueueCounts | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue-counts", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      if (data?.counts) setCounts(data.counts as AdminQueueCounts);
    } catch {
      // Badges are decoration; ignore network errors.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-check on tab focus, every 30s, and right after any approve/save
  // anywhere in the app, so the badges never go stale.
  useAutoRefresh(() => refresh(), { paths: ["/api/admin/queue-counts"], intervalMs: 60_000 });

  return { counts, refresh };
}
