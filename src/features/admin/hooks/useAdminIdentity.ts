"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminIdentity } from "@/features/admin/components/ui/AdminIdentityContext";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

/**
 * Name of the signed-in Admin for the greeting and the top-bar avatar.
 * Best-effort: a failed request leaves the neutral fallback in place.
 */
export function useAdminIdentityLoader() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/profile", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const admin = data?.admin;

      if (admin) {
        setIdentity({ firstName: admin.firstName ?? "", lastName: admin.lastName ?? "" });
      }
    } catch {
      // Decoration only; ignore network errors.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Picks up a name change made on the Profile page.
  useAutoRefresh(() => load(), { paths: ["/api/admin/profile"] });

  return identity;
}
