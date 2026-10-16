"use client";

import { useEffect, useState } from "react";

import {
  getInterviewJoinWindow,
  type InterviewJoinWindow,
} from "@/features/shared/utils/interviewWindow";

const CLOCK_TICK_MS = 15_000;

/**
 * Live state of an interview's Join button. `now` is the viewer's clock
 * corrected by the server's `serverNow`, so the button unlocks at the right
 * moment even on a device with a wrong clock. This only decides what the
 * button looks like: the join route re-checks the window on the server.
 */
export function useInterviewJoinWindow(
  scheduledAtIso: string | null,
  serverNowIso: string | null,
): InterviewJoinWindow {
  const [tick, setTick] = useState(() => Date.now());
  const [skewMs, setSkewMs] = useState(0);

  useEffect(() => {
    if (!serverNowIso) return;

    const server = new Date(serverNowIso).getTime();

    if (!Number.isNaN(server)) setSkewMs(server - Date.now());
  }, [serverNowIso]);

  useEffect(() => {
    if (!scheduledAtIso) return;

    const clock = setInterval(() => setTick(Date.now()), CLOCK_TICK_MS);

    return () => clearInterval(clock);
  }, [scheduledAtIso]);

  return getInterviewJoinWindow(scheduledAtIso, new Date(tick + skewMs));
}
