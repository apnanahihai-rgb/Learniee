"use client";

import { useEffect, useState } from "react";
import type { AdminUser } from "@/features/admin/types/user";

export function useAdminUserDetail(email: string, role: AdminUser["role"]) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/admin/user-details?email=${encodeURIComponent(email)}&role=${role}`,
        );
        if (!res.ok) throw new Error("Failed to load details");
        const data = await res.json();
        if (!cancelled) setDetail(data.user);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [email, role]);

  return { detail, loading, error };
}
