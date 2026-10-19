"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface ParentNextAction {
  stage: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  autoOpenSurveyId: string | null;
}

/** Loads the dashboard "next best action" card (GET /api/parent/next-action). */
export function useNextAction() {
  const [action, setAction] = useState<ParentNextAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/parent/next-action", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load your next step.");
      }

      setAction(data.action ?? null);
    } catch (err) {
      console.error("Load next action error:", err);
      setError(err instanceof Error ? err.message : "Failed to load your next step.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useAutoRefresh(() => reload(), { paths: ["/api/parent/next-action"] });

  return { action, loading, error, reload };
}
