"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

import type { ParentCommunityDetail, ParentCommunityRow } from "../types/community";

export type MembershipResult = { ok: true } | { ok: false; error: string };

const BASE = "/api/parent/communities";

async function changeMembership(communityId: string, method: "POST" | "DELETE"): Promise<MembershipResult> {
  try {
    const res = await fetch(`${BASE}/${communityId}/membership`, { method });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || "Something went wrong. Please try again." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Community membership error:", err);

    return { ok: false, error: "Network error. Please try again." };
  }
}

/** Parent's community list + join / leave. Data: /api/parent/communities. Refreshes live. */
export function useParentCommunities() {
  const [communities, setCommunities] = useState<ParentCommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(BASE, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Failed to load communities.");

      setCommunities(data.communities ?? []);
    } catch (err) {
      console.error("Load communities error:", err);
      setError(err instanceof Error ? err.message : "Failed to load communities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE] });

  const join = useCallback(
    async (communityId: string) => {
      const result = await changeMembership(communityId, "POST");

      if (result.ok) await load();

      return result;
    },
    [load],
  );

  const leave = useCallback(
    async (communityId: string) => {
      const result = await changeMembership(communityId, "DELETE");

      if (result.ok) await load();

      return result;
    },
    [load],
  );

  return { communities, loading, error, reload: load, join, leave };
}

/** One community for a Parent (files only once joined). Refreshes live. */
export function useParentCommunity(communityId: string) {
  const [community, setCommunity] = useState<ParentCommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(`${BASE}/${communityId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Failed to load the community.");

      setCommunity(data.community);
    } catch (err) {
      console.error("Load community error:", err);
      setCommunity(null);
      setError(err instanceof Error ? err.message : "Failed to load the community.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE] });

  const join = useCallback(async () => {
    const result = await changeMembership(communityId, "POST");

    if (result.ok) await load();

    return result;
  }, [communityId, load]);

  const leave = useCallback(async () => {
    const result = await changeMembership(communityId, "DELETE");

    if (result.ok) await load();

    return result;
  }, [communityId, load]);

  return { community, loading, error, reload: load, join, leave };
}
