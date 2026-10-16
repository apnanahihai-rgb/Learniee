"use client";

import { useCallback, useState } from "react";

/**
 * Click handler for an interview's "Join" button. A tab is opened
 * synchronously inside the click (so the browser's popup blocker allows
 * it) and pointed at the Meet link once the server has handed it out; on
 * any error the tab is closed again and `error` says why.
 * `hostWarning` is true when an Admin got in but Meet could not confirm
 * them as co-host (they join as a normal participant).
 */
export function useInterviewJoin(endpoint: string) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [hostWarning, setHostWarning] = useState(false);

  const join = useCallback(async () => {
    setJoining(true);
    setError("");
    setHostWarning(false);

    const tab = window.open("about:blank", "_blank");

    if (tab) tab.opener = null;

    try {
      const res = await fetch(endpoint, { method: "POST", cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || typeof data.meetingUri !== "string") {
        throw new Error(data.error || "Could not open the interview room.");
      }

      if (data.hostConfirmed === false) setHostWarning(true);

      if (tab) {
        tab.location.href = data.meetingUri;
      } else {
        window.location.assign(data.meetingUri);
      }
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Could not open the interview room.");
    } finally {
      setJoining(false);
    }
  }, [endpoint]);

  return { join, joining, error, hostWarning };
}
