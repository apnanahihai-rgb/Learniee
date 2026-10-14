"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";

const CLOCK_TICK_MS = 1_000;

export type SessionFlowRole = "teacher" | "parent";

/**
 * `start`/`end`/`cancel` (teacher), `join`/`cancel` (parent), and the
 * after-class actions of Part 2A: `summary` (teacher), `confirm` and
 * `report` (parent).
 */
export type SessionFlowAction =
  | "start"
  | "join"
  | "end"
  | "cancel"
  | "summary"
  | "confirm"
  | "report";

/**
 * Loads one class session's flow state for the Start / Join / End
 * page and runs its actions (see `SessionFlowAction`).
 *
 * - Refetches the moment the session changes on the server (live-update
 *   stream, see `src/lib/realtimeClient.ts`), so the teacher sees the
 *   parent join and the parent sees the class end without refreshing.
 *   Only the 1s clock below is a timer — it moves the buttons, it does
 *   not fetch anything.
 * - `now()` is the viewer's clock corrected by the server's
 *   `serverNow`, so the buttons open at the right moment even on a
 *   device with a wrong clock. The server re-checks every action
 *   itself — this only decides what the buttons look like.
 */
export function useSessionFlow(role: SessionFlowRole, sessionId: string) {
  const base = `/api/${role}/class-sessions/${sessionId}`;

  const [state, setState] = useState<SessionFlowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const [skewMs, setSkewMs] = useState(0);
  const mountedRef = useRef(true);

  const apply = useCallback((next: SessionFlowState) => {
    setSkewMs(new Date(next.serverNow).getTime() - Date.now());
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(base);
      const data = await res.json();

      if (!mountedRef.current) return;

      if (!res.ok) {
        throw new Error(data.error || "Failed to load this session.");
      }

      apply(data.session);
      setError("");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load this session.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [base, apply]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  const shouldPoll = state?.isCycleSession === true && state.status === "SCHEDULED";

  useEffect(() => {
    if (!shouldPoll) return;

    const clock = setInterval(() => setTick(Date.now()), CLOCK_TICK_MS);

    return () => {
      clearInterval(clock);
    };
  }, [shouldPoll]);

  useAutoRefresh(() => refresh(), { paths: [base], staleMs: 10_000 });

  const perform = useCallback(
    async (action: SessionFlowAction, body?: Record<string, unknown>) => {
      try {
        setBusy(true);
        setError("");

        const res = await fetch(`${base}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "That didn't work. Please try again.");
        }

        apply(data.session);
        return data.session as SessionFlowState;
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't work. Please try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [base, apply],
  );

  const act = useCallback(
    async (action: SessionFlowAction, body?: Record<string, unknown>) =>
      (await perform(action, body)) !== null,
    [perform],
  );

  /**
   * Start (teacher) / Join (parent) and go straight into Google Meet.
   * A tab is opened synchronously inside the click (so the browser's
   * popup blocker allows it) and pointed at the Meet link once the
   * server has recorded the event. If Meet is off, the room isn't
   * ready, or the teacher isn't confirmed as co-host yet, the tab is
   * closed again and the page's own state shows why.
   * `copyText` (the student's name) is put on the clipboard at click
   * time, for the "enter your name" box Meet shows to signed-out guests.
   */
  const enterMeeting = useCallback(
    async (action: "start" | "join", copyText?: string | null) => {
      const meetingOn = state?.meetingEnabled === true;
      const tab = meetingOn ? window.open("about:blank", "_blank") : null;

      if (tab) tab.opener = null;

      if (meetingOn && copyText) {
        navigator.clipboard?.writeText(copyText).catch(() => {});
      }

      const session = await perform(action);
      const uri = session?.meetingUri ?? null;
      // Teacher whose co-host isn't confirmed by Meet yet: don't drop
      // them into the room as a plain participant. The page shows a
      // warning with "Retry" and "Join anyway" instead.
      const hostPending = action === "start" && session?.meetingCohost === "PENDING";

      if (uri && !hostPending) {
        if (tab) {
          tab.location.href = uri;
        } else {
          window.location.assign(uri);
        }
      } else {
        tab?.close();
      }

      return session !== null;
    },
    [state?.meetingEnabled, perform],
  );

  // Server-corrected "now" as of the last clock tick.
  const now = new Date(tick + skewMs);

  return { state, loading, error, busy, now, act, enterMeeting };
}
