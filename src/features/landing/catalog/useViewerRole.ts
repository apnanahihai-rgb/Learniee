"use client";

import { useSyncExternalStore } from "react";
import Cookies from "js-cookie";

/**
 * Who is looking at a public page, read from the readable `viewerRole` hint
 * cookie the login route sets next to the (httpOnly) session cookies.
 * UI-only: it decides which link to show. It is NOT a security check —
 * /parent/* is still gated by middleware and the APIs.
 *
 * `null` = not known yet (server render / first paint) — treat as anonymous.
 */
export type ViewerRole = "anonymous" | "parent" | "other";

function readRole(): ViewerRole {
  const role = Cookies.get("viewerRole");
  if (!role) return "anonymous";
  return role === "parent" ? "parent" : "other";
}

const subscribe = () => () => {};
const getServerSnapshot = (): ViewerRole | null => null;

export function useViewerRole(): ViewerRole | null {
  return useSyncExternalStore(subscribe, readRole, getServerSnapshot);
}
