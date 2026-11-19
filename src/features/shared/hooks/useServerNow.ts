"use client";

import { useEffect, useState } from "react";

/**
 * "Now" corrected to the server clock, ticking every second (for live
 * countdowns). `null` until the first client render, so time-dependent UI
 * renders only after mount and never mismatches the server HTML.
 *
 * `skewMs` is the server clock minus this device's clock, as returned by the
 * Parent and Teacher Home endpoints (`serverNow`).
 */
export function useServerNow(skewMs: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + skewMs));

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [skewMs]);

  return now;
}
