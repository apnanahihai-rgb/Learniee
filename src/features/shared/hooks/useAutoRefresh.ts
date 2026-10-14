"use client";

import { useEffect, useRef } from "react";

import {
  DATA_CHANGED_EVENT,
  installMutationNotifier,
  runAsBackgroundRefresh,
} from "@/lib/refreshBus";

const DEFAULT_INTERVAL_MS = 30_000;
/** Ignore a trigger that comes right after the previous refresh. */
const MIN_GAP_MS = 1_500;

interface UseAutoRefreshOptions {
  /** Poll interval while the tab is visible. `0` disables polling. */
  intervalMs?: number;
  /** Set false to pause every trigger (e.g. while a form is open). */
  enabled?: boolean;
}

/**
 * Keeps a data hook fresh without a manual page refresh. Calls
 * `refresh` again when:
 *  - the tab becomes visible / the window regains focus / the
 *    network comes back,
 *  - every `intervalMs` while the tab is visible, and
 *  - any successful write to our API happened anywhere in the app
 *    (see `installMutationNotifier` in `src/lib/refreshBus.ts`).
 *
 * `refresh` is called inside a "background refresh" scope: loaders
 * that guard `setLoading(true)` with `isBackgroundRefresh()` won't
 * flash their loading state. The latest `refresh` closure is always
 * used, so it sees current filters/pages. The first load is still the
 * hook's own `useEffect`; this hook only handles the re-checks.
 */
export function useAutoRefresh(
  refresh: () => unknown,
  { intervalMs = DEFAULT_INTERVAL_MS, enabled = true }: UseAutoRefreshOptions = {},
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    installMutationNotifier();

    let disposed = false;
    let inFlight = false;
    let queued = false;
    let lastRun = Date.now();

    function run(force: boolean) {
      if (disposed || document.visibilityState === "hidden") {
        return;
      }

      if (inFlight) {
        // One refresh at a time; remember that another was wanted.
        queued = true;
        return;
      }

      if (!force && Date.now() - lastRun < MIN_GAP_MS) {
        return;
      }

      lastRun = Date.now();
      inFlight = true;

      let result: unknown;

      try {
        result = runAsBackgroundRefresh(() => refreshRef.current());
      } catch (error) {
        console.error("Auto refresh failed:", error);
      }

      Promise.resolve(result)
        .catch((error) => console.error("Auto refresh failed:", error))
        .finally(() => {
          inFlight = false;

          if (queued) {
            queued = false;
            run(true);
          }
        });
    }

    const onVisible = () => run(false);
    const onChanged = () => run(true);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);

    const interval =
      intervalMs > 0 ? setInterval(() => run(false), intervalMs) : null;

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      window.removeEventListener(DATA_CHANGED_EVENT, onChanged);

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [enabled, intervalMs]);
}
