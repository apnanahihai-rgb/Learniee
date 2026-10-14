/**
 * Targeted refresh bus used by `useAutoRefresh`.
 *
 * Instead of refetching everything after a change, each data hook
 * declares the API paths it reads (`paths`). After a successful write
 * (POST/PUT/PATCH/DELETE) to one of our own `/api/*` routes, only the
 * hooks whose paths overlap the written resource — plus the few
 * resources that are known to change with it (`RELATED`) — refetch.
 * Everything else stays untouched, so server load stays small.
 *
 * Browser-only; every function is a safe no-op during SSR.
 */

export const DATA_CHANGED_EVENT = "learniee:data-changed";

export interface DataChangedDetail {
  /** API path prefixes that changed (written resource + related ones). */
  prefixes: string[];
  /** When the latest write in this batch finished (ms since epoch). */
  at: number;
}

// ── Background-refresh flag (no spinner flicker) ───────────────────

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

// ── Path matching ──────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.split("?")[0].replace(/\/+$/, "");
}

/** True when one path is the other, or lives underneath it (segment-aware). */
export function pathsOverlap(a: string, b: string): boolean {
  const x = normalizePath(a);
  const y = normalizePath(b);

  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

/**
 * Resources that change together. Key = a write path prefix; value =
 * other read paths that should refetch after it. Keep this short: the
 * default is "only the resource that was written".
 */
const RELATED: Array<[prefix: string, alsoRefresh: string[]]> = [
  // Admin sidebar badge counts can change after any Admin write.
  ["/api/admin/", ["/api/admin/queue-counts"]],
  ["/api/admin/teachers", ["/api/admin/directory/teachers"]],
  ["/api/admin/delete-user", ["/api/admin/directory", "/api/admin/users"]],

  ["/api/parent/enrollments", [
    "/api/parent/my-classes",
    "/api/parent/invoices",
    "/api/parent/wallet",
    "/api/parent/calendar",
  ]],
  ["/api/parent/my-classes", ["/api/parent/enrollments", "/api/parent/calendar"]],
  ["/api/parent/class-sessions", [
    "/api/parent/my-classes",
    "/api/parent/enrollments",
    "/api/parent/calendar",
  ]],
  ["/api/parent/reschedule-requests", ["/api/parent/calendar", "/api/parent/my-classes"]],
  ["/api/parent/wallet", ["/api/parent/invoices"]],
  ["/api/parent/demo-coupons", ["/api/parent/invoices"]],
  ["/api/parent/demo-bookings", ["/api/parent/demo-coupons", "/api/parent/invoices"]],

  ["/api/teacher/class-sessions", [
    "/api/teacher/my-classes",
    "/api/teacher/calendar",
    "/api/teacher/enrollments",
  ]],
  ["/api/teacher/enrollments", ["/api/teacher/my-classes", "/api/teacher/calendar"]],
  ["/api/teacher/reschedule-requests", ["/api/teacher/calendar", "/api/teacher/my-classes"]],
  ["/api/teacher/leave-requests", ["/api/teacher/calendar"]],

  ["/api/accounts/payout-queue", ["/api/accounts/ledger"]],
  ["/api/accounts/ledger", ["/api/accounts/payout-queue"]],
  ["/api/accounts/wallet", ["/api/accounts/invoices"]],
];

/** The written path itself plus every related read path. */
export function expandInvalidations(writePath: string): string[] {
  const path = normalizePath(writePath);
  const result = new Set<string>([path]);

  for (const [prefix, extra] of RELATED) {
    const matches = prefix.endsWith("/")
      ? path.startsWith(prefix)
      : path === prefix || path.startsWith(`${prefix}/`);

    if (matches) {
      extra.forEach((item) => result.add(item));
    }
  }

  return [...result];
}

// ── Last-fetch bookkeeping (skip refetches that are already fresh) ──

const lastGetAt = new Map<string, number>();

/** When did any GET overlapping `paths` last start? (0 = never seen.) */
export function latestFetchAt(paths: string[]): number {
  let latest = 0;

  for (const [fetched, at] of lastGetAt) {
    if (at > latest && paths.some((path) => pathsOverlap(path, fetched))) {
      latest = at;
    }
  }

  return latest;
}

// ── Fetch wrapper ──────────────────────────────────────────────────

/** Writes to these prefixes never change what other screens show. */
const IGNORED_PREFIXES = ["/api/notifications", "/api/upload", "/api/cron", "/api/webhooks", "/api/activity"];

const NOTIFY_DEBOUNCE_MS = 250;

type PatchedWindow = Window & { __learnieeFetchPatched?: boolean };

/**
 * Wraps `window.fetch` once so that:
 *  1. same-origin `GET /api/*` calls default to `cache: "no-store"`
 *     and their start time is remembered (so a hook that has just
 *     reloaded itself is not refetched a second time), and
 *  2. after a successful `POST/PUT/PATCH/DELETE /api/*`, a
 *     `DATA_CHANGED_EVENT` is fired carrying the changed paths — only
 *     the hooks that read those paths refetch.
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
  let pendingPrefixes = new Set<string>();
  let pendingAt = 0;

  function scheduleNotify(writePath: string) {
    expandInvalidations(writePath).forEach((prefix) => pendingPrefixes.add(prefix));
    pendingAt = Date.now();

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      const detail: DataChangedDetail = { prefixes: [...pendingPrefixes], at: pendingAt };

      timer = null;
      pendingPrefixes = new Set<string>();
      window.dispatchEvent(new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, { detail }));
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

    if (apiPath && method === "GET") {
      lastGetAt.set(normalizePath(apiPath), Date.now());
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
      scheduleNotify(apiPath);
    }

    return response;
  };
}
