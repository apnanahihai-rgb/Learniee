"use client";

import { useCallback, useEffect, useState } from "react";

export interface DemoCouponBalance {
  totalIssued: number;
  usedCount: number;
  remainingFree: number;
  paidDemoPrice: number;
}

/**
 * Loads the logged-in parent's demo coupon balance
 * (GET /api/parent/demo-coupons). Account-level, not per child —
 * see 06-OPEN-DECISIONS.md #26. Call `reload()` after a successful
 * booking so the balance reflects the just-used coupon.
 */
export function useDemoCoupons() {
  const [balance, setBalance] = useState<DemoCouponBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/parent/demo-coupons", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo coupon balance.");
      }

      setBalance(data);
    } catch (err) {
      console.error("Load demo coupons error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load demo coupon balance.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { balance, loading, error, reload };
}
