"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { startRealtime } from "@/lib/realtimeClient";
import { installMutationNotifier } from "@/lib/refreshBus";

/**
 * Mounted once in the root layout. Installs the fetch wrapper that
 * (a) disables caching for our own GET API calls and (b) announces
 * successful writes so every open data hook refetches (see
 * `useAutoRefresh`), and opens the live-update stream so changes made
 * by OTHER people reach this tab the same way (see `realtimeClient`).
 * Renders nothing.
 */
export default function AutoRefreshProvider() {
  const pathname = usePathname();

  useEffect(() => {
    installMutationNotifier();
  }, []);

  // Re-checked on every route change so the stream connects right after
  // login (the cookie only exists from then on) without a page reload.
  useEffect(() => {
    startRealtime();
  }, [pathname]);

  return null;
}
