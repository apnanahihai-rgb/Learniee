"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AdminUser } from "@/features/admin/types/user";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export function useAdminUserDetail(email: string, role: AdminUser["role"]) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every load and on cleanup so a slow response for an old
  // user (or an unmounted page) is ignored.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    // Silent when run by the live-update refresh: no spinner, and a
    // failed refresh keeps what is already on screen.
    const background = isBackgroundRefresh();

    if (!background) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(
        `/api/admin/user-details?email=${encodeURIComponent(email)}&role=${role}`,
      );
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      if (request !== requestRef.current) return;
      setDetail(data.user);
      setError(null);
    } catch (e) {
      if (request === requestRef.current && !background) setError((e as Error).message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [email, role]);

  useEffect(() => {
    void load();

    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/admin/user-details"] });

  return { detail, loading, error };
}
