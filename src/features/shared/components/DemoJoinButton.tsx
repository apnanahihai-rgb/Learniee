"use client";

import { useEffect, useState } from "react";
import { Loader2, Video } from "lucide-react";

/**
 * Join button for a demo's Google Meet room (Oct 19, 2026). Used on the
 * Parent's Free Demo page and on the Teacher's Demo page + dashboard.
 *
 * The link is never in the booking list: the button asks the server for it
 * (`POST /api/{parent|teacher}/demo-bookings/[id]/join`), which re-checks the
 * join window on ITS clock. The window shown here only decides what the
 * button says; `skewMs` (server time minus device time, from the list
 * response) keeps a wrong device clock from showing "Join" too early/late.
 */

export interface DemoJoinWindowDto {
  state: "NO_DEMO" | "NOT_YET" | "OPEN" | "CLOSED";
  opensAt: string | null;
  closesAt: string | null;
}

export type DemoJoinLiveState = "NOT_YET" | "OPEN" | "CLOSED";

/** Window state at `nowMs` (server-corrected), from the window the server sent. */
export function liveDemoJoinState(window: DemoJoinWindowDto | undefined, nowMs: number): DemoJoinLiveState {
  if (!window || window.state === "NO_DEMO" || !window.opensAt || !window.closesAt) return "CLOSED";

  if (nowMs < new Date(window.opensAt).getTime()) return "NOT_YET";
  if (nowMs >= new Date(window.closesAt).getTime()) return "CLOSED";

  return "OPEN";
}

/** Re-renders every `everyMs` and returns the server-corrected "now" in ms. */
export function useServerClock(skewMs: number, everyMs = 15_000): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), everyMs);

    return () => window.clearInterval(id);
  }, [everyMs]);

  return tick + skewMs;
}

interface DemoJoinButtonProps {
  role: "parent" | "teacher";
  bookingId: string;
  status: string;
  joinWindow: DemoJoinWindowDto | undefined;
  /** False when `GOOGLE_MEET_ENABLED` is off on the server. */
  meetEnabled: boolean;
  /** Server time minus device time, in ms. */
  skewMs: number;
  /** Put on the clipboard at click time (the child's name, for Meet's guest-name box). */
  copyText?: string | null;
  className?: string;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();

  return d.toLocaleString("en-IN", {
    ...(sameDay ? {} : { weekday: "short", day: "numeric", month: "short" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DemoJoinButton({
  role,
  bookingId,
  status,
  joinWindow,
  meetEnabled,
  skewMs,
  copyText,
  className = "",
}: DemoJoinButtonProps) {
  const nowMs = useServerClock(skewMs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openedUri, setOpenedUri] = useState<string | null>(null);

  if (status !== "CONFIRMED") return null;

  const state = liveDemoJoinState(joinWindow, nowMs);

  if (state === "CLOSED") return null;

  if (!meetEnabled) {
    return (
      <p className={`text-xs text-gray-400 ${className}`}>
        The video room isn&apos;t switched on yet — we&apos;ll let you know.
      </p>
    );
  }

  const idle = role === "teacher" ? "Start demo" : "Join demo";

  async function handleJoin() {
    setError("");
    setNotice("");

    // Opened synchronously inside the click so the popup blocker allows it,
    // then pointed at the link once the server has handed it out.
    const tab = window.open("about:blank", "_blank");

    if (tab) tab.opener = null;

    if (copyText) navigator.clipboard?.writeText(copyText).catch(() => {});

    setBusy(true);

    try {
      const res = await fetch(`/api/${role}/demo-bookings/${bookingId}/join`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.meetingUri) {
        throw new Error(data.error || "Could not open the demo room. Please try again.");
      }

      setOpenedUri(data.meetingUri);

      if (tab) {
        tab.location.href = data.meetingUri;
      } else {
        window.location.assign(data.meetingUri);
      }

      if (data.hostConfirmed === false) {
        setNotice(
          "You joined, but Meet hasn't confirmed you as host yet. Sign in to Google with your Learniee email and rejoin if you can't admit people.",
        );
      }
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Could not open the demo room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {state === "NOT_YET" ? (
        <button
          type="button"
          disabled
          className="h-9 px-4 rounded-full bg-violet-50 text-brand/60 text-xs font-bold flex items-center gap-2 cursor-not-allowed"
        >
          <Video size={14} />
          {joinWindow?.opensAt ? `Link opens ${timeLabel(joinWindow.opensAt)}` : "Link not open yet"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={busy}
          className="h-9 px-4 rounded-full bg-brand text-white text-xs font-bold hover:bg-brand-dark transition active:scale-[0.97] disabled:opacity-60 flex items-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
          {idle}
        </button>
      )}

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {notice && <p className="text-xs text-amber-600 mt-1.5">{notice}</p>}
      {openedUri && !error && (
        <p className="text-xs text-gray-500 mt-1.5">
          Didn&apos;t open?{" "}
          <a
            href={openedUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            Open the Meet link
          </a>
        </p>
      )}
    </div>
  );
}
