"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getOnline = () => navigator.onLine;
// The server (and first hydration) assume online so markup matches.
const getServerOnline = () => true;

/** Thin banner shown across the top while the browser has no internet connection. */
export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getOnline, getServerOnline);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] bg-gray-900 px-4 py-2 text-center text-sm font-semibold text-white"
    >
      You&apos;re offline. Check your internet connection — we&apos;ll reconnect automatically.
    </div>
  );
}
