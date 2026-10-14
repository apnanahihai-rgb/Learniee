"use client";

import { useEffect, useRef } from "react";

import {
  DATA_CHANGED_EVENT,
  installMutationNotifier,
  latestFetchAt,
  pathsOverlap,
  runAsBackgroundRefresh,
  type DataChangedDetail,
} from "@/lib/refreshBus";

/** After this long without a fetch, coming back to the tab refetches. */
const DEFAULT_STALE_MS = 60_000;
/** Ignore a trigger that comes right after the previous refresh. */
const MIN_GAP_MS = 1_500;

interface UseAutoRefreshOptions {
  /**
   * The API paths this hook reads, e.g. `["/api/parent/wallet"]`.
   * The hook refetches only when a write to one of these resources
   * (or a known related one, see `RELATED` in `src/lib/refreshBus.ts`)
   * succeeds anywhere in the app.
   */
  paths: string[];
  /** Set false to pause every trigger (e.g. a hook that is not in use). */
  enabled?: boolean;
  /**
   * Coming back to the tab / regaining focus refetches only if the data
   * is older than this (ms). Default 60s — quick tab flips cost nothing.
   */
  staleMs?: number;
  /**
   * Optional slow poll while the tab is visible, for data that other
   * people change (e.g. an Admin queue). Off by default (`0`).
   */
  intervalMs?: number;
}

/**
 * Keeps one data hook fresh without a manual page refresh, and without
 * reloading anything else. `refresh` re-runs only when:
 *  - a write to a resource this hook reads succeeds (event-driven; if
 *    the hook already refetched after that write, it is skipped), or
 *  - the tab/window is revisited and the data is older than `staleMs`, or
 *  - `intervalMs` is set and elapses while the tab is visible.
 *
 * `refresh` runs in a "background refresh" scope: loaders that guard
 * `setLoading(true)` with `isBackgroundRefresh()` won't flash a spinner.
 * The latest `refresh` closure is always used, so it sees current
 * filters/pages. The first load is still the hook's own `useEffect`.
 */
export function useAutoRefresh(
  refresh: () => unknown,
  { paths, enabled = true, staleMs = DEFAULT_STALE_MS, intervalMs = 0 }: UseAutoRefreshOptions,
) {
  const refreshRef = useRef(refresh);
  const pathsKey = paths.join("|");

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    installMutationNotifier();

    const watched = pathsKey ? pathsKey.split("|") : [];
    let disposed = false;
    let inFlight = false;
    let queued = false;
    let lastRun = Date.now(); // the hook's own first load just happened

    function freshness() {
      return Math.max(lastRun, latestFetchAt(watched));
    }

    function run() {
      if (disposed || document.visibilityState === "hidden") {
        return;
      }

      if (inFlight) {
        // One refresh at a time; remember that another was wanted.
        queued = true;
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
            run();
          }
        });
    }

    function onRevisit() {
      const age = Date.now() - freshness();

      if (age >= Math.max(staleMs, MIN_GAP_MS)) {
        run();
      }
    }

    function onChanged(event: Event) {
      const { prefixes, at } = (event as CustomEvent<DataChangedDetail>).detail ?? {
        prefixes: [],
        at: 0,
      };

      const affected = watched.some((path) =>
        prefixes.some((prefix) => pathsOverlap(path, prefix)),
      );

      // Already refetched after that write (e.g. the hook reloads itself
      // after its own action)? Then nothing to do.
      if (!affected || latestFetchAt(watched) >= at) {
        return;
      }

      run();
    }

    document.addEventListener("visibilitychange", onRevisit);
    window.addEventListener("focus", onRevisit);
    window.addEventListener("online", onRevisit);
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);

    const interval = intervalMs > 0 ? setInterval(run, intervalMs) : null;

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onRevisit);
      window.removeEventListener("focus", onRevisit);
      window.removeEventListener("online", onRevisit);
      window.removeEventListener(DATA_CHANGED_EVENT, onChanged);

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [enabled, staleMs, intervalMs, pathsKey]);
}
