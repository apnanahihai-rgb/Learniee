/**
 * Browser side of the live-update stream (`GET /api/realtime`).
 *
 * The server sends "this data changed" signals as API path prefixes.
 * They are re-published as the same `learniee:data-changed` event that
 * `useAutoRefresh` already listens for (see `refreshBus.ts`), so each
 * component refetches only its own data — no page reload, no timers.
 *
 * Connection rules:
 *  - Opens only while the tab is visible and a login cookie exists;
 *    closes when the tab is hidden, and reopens when it is shown again.
 *  - After being offline / hidden for more than a few seconds, one
 *    catch-all event makes every mounted component refetch once, so
 *    nothing that changed in the gap stays stale.
 *  - The server recycles each stream every few minutes; the browser
 *    reconnects by itself within a second, which does NOT trigger the
 *    catch-all.
 *  - Set `NEXT_PUBLIC_REALTIME=off` to disable the stream entirely
 *    (components then refresh after your own changes and when the tab
 *    is revisited, as before).
 *
 * Browser-only; every function is a safe no-op during SSR.
 */

import {
  DATA_CHANGED_EVENT,
  expandInvalidations,
  type DataChangedDetail,
} from "@/lib/refreshBus";

const STREAM_URL = "/api/realtime";
/** Disconnected for longer than this → refetch everything once on reconnect. */
const RESYNC_GAP_MS = 5_000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 60_000;
const DISABLED = process.env.NEXT_PUBLIC_REALTIME === "off";

let listening = false;
let source: EventSource | null = null;
let disconnectedAt: number | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryMs = RETRY_MIN_MS;

function hasSession(): boolean {
  // The session tokens are httpOnly (not readable here); `viewerRole` is the
  // readable hint cookie the login route sets alongside them.
  return /(?:^|;\s*)viewerRole=/.test(document.cookie);
}

function emit(prefixes: string[]) {
  const expanded = new Set<string>();

  prefixes.forEach((prefix) => expandInvalidations(prefix).forEach((item) => expanded.add(item)));

  const detail: DataChangedDetail = { prefixes: [...expanded], at: Date.now() };

  window.dispatchEvent(new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, { detail }));
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function disconnect() {
  clearRetry();

  if (source) {
    source.close();
    source = null;
  }

  disconnectedAt ??= Date.now();
}

function scheduleRetry() {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, retryMs);

  retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
}

function connect() {
  if (
    DISABLED ||
    source ||
    typeof EventSource === "undefined" ||
    document.visibilityState === "hidden" ||
    !hasSession()
  ) {
    return;
  }

  clearRetry();

  const stream = new EventSource(STREAM_URL);

  source = stream;

  stream.addEventListener("ready", () => {
    retryMs = RETRY_MIN_MS;

    if (disconnectedAt !== null && Date.now() - disconnectedAt > RESYNC_GAP_MS) {
      emit(["/api"]);
    }

    disconnectedAt = null;
  });

  stream.addEventListener("change", (event) => {
    try {
      const { prefixes } = JSON.parse((event as MessageEvent<string>).data) as { prefixes?: unknown };

      if (Array.isArray(prefixes) && prefixes.length > 0) {
        emit(prefixes.filter((prefix): prefix is string => typeof prefix === "string"));
      }
    } catch {
      // Ignore a malformed message.
    }
  });

  stream.onerror = () => {
    disconnectedAt ??= Date.now();

    // CLOSED = the server refused (e.g. 401 after the session expired);
    // the browser will not retry on its own, so back off and try again.
    // CONNECTING = a dropped connection the browser is already retrying.
    if (stream.readyState === EventSource.CLOSED) {
      stream.close();

      if (source === stream) {
        source = null;
      }

      scheduleRetry();
    }
  };
}

/**
 * Starts (and keeps alive) the live-update connection. Safe to call
 * repeatedly — e.g. on every route change, so it connects right after
 * login without a page reload.
 */
export function startRealtime(): void {
  if (typeof window === "undefined" || DISABLED) {
    return;
  }

  if (!listening) {
    listening = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        disconnect();
      } else {
        connect();
      }
    });

    window.addEventListener("online", connect);
    window.addEventListener("offline", disconnect);
  }

  connect();
}
