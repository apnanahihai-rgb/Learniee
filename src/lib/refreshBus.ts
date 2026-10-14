/**
 * Tiny client-side "data changed" bus used by `useAutoRefresh`.
 *
 * - `notifyDataChanged()` tells every mounted data hook to refetch.
 *   It is fired automatically after any successful write to our own
 *   `/api/*` routes (see `installMutationNotifier`).
 * - `isBackgroundRefresh()` is true only while `useAutoRefresh` is
 *   calling a loader, so loaders can skip their loading spinner on a
 *   silent refresh (no flicker every time data is re-checked).
 *
 * Browser-only; every function is a safe no-op during SSR.
 */

export const DATA_CHANGED_EVENT = "learniee:data-changed";

let backgroundDepth = 0;

/** True while a loader is being run by `useAutoRefresh` (silent refresh). */
export function isBackgroundRefresh(): boolean {
  return backgroundDepth > 0;
}

/**
 * Runs `fn` flagged as a background refresh. The flag only covers the
 * synchronous part of `fn`, which is exactly where loaders call
 * `setLoading(true)` (before their first `await`).
 */
export function runAsBackgroundRefresh<T>(fn: () => T): T {
  backgroundDepth += 1;

  try {
    return fn();
  } finally {
    backgroundDepth -= 1;
  }
}

/** Ask every mounted data hook to refetch. */
export function notifyDataChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

// ── Mutation notifier ───────────────────────────────────────────────

/** Writes to these prefixes never change what other screens show. */
const IGNORED_PREFIXES = ["/api/notifications", "/api/upload", "/api/cron", "/api/webhooks"];

const NOTIFY_DEBOUNCE_MS = 250;

type PatchedWindow = Window & { __learnieeFetchPatched?: boolean };

/**
 * Wraps `window.fetch` once so that:
 *  1. same-origin `GET /api/*` calls default to `cache: "no-store"`
 *     (never serve a stale copy from the browser/Next cache), and
 *  2. after any successful `POST/PUT/PATCH/DELETE /api/*`, every
 *     mounted data hook is told to refetch — so a page updates itself
 *     after an approve / save / cancel without a manual refresh.
 *
 * Idempotent; safe to call from several places.
 */
export function installMutationNotifier(): void {
  if (typeof window === "undefined") {
    return;
  }

  const w = window as PatchedWindow;

  if (w.__learnieeFetchPatched) {
    return;
  }

  w.__learnieeFetchPatched = true;

  const originalFetch = window.fetch.bind(window);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleNotify() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      notifyDataChanged();
    }, NOTIFY_DEBOUNCE_MS);
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let apiPath: string | null = null;
    let method = (init?.method ?? "GET").toUpperCase();
    let nextInit = init;

    try {
      if (input instanceof Request) {
        method = (init?.method ?? input.method).toUpperCase();
        const url = new URL(input.url, window.location.origin);

        if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
          apiPath = url.pathname;
        }
      } else {
        const url = new URL(String(input), window.location.origin);

        if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
          apiPath = url.pathname;

          if (method === "GET" && init?.cache === undefined) {
            nextInit = { ...init, cache: "no-store" };
          }
        }
      }
    } catch {
      // Unparseable URL — just pass the call through untouched.
    }

    const response = await originalFetch(input, nextInit);

    if (
      apiPath &&
      response.ok &&
      method !== "GET" &&
      method !== "HEAD" &&
      method !== "OPTIONS" &&
      !IGNORED_PREFIXES.some((prefix) => apiPath!.startsWith(prefix))
    ) {
      scheduleNotify();
    }

    return response;
  };
}
