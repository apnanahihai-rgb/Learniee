"use client";

import { useEffect } from "react";

import { installMutationNotifier } from "@/lib/refreshBus";

/**
 * Mounted once in the root layout. Installs the fetch wrapper that
 * (a) disables caching for our own GET API calls and (b) announces
 * successful writes so every open data hook refetches (see
 * `useAutoRefresh`). Renders nothing.
 */
export default function AutoRefreshProvider() {
  useEffect(() => {
    installMutationNotifier();
  }, []);

  return null;
}
