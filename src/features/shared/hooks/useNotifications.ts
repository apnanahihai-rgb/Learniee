"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls `/api/notifications` every 30s — same simple
 * fetch-on-mount-plus-interval pattern as `useWallet.ts` /
 * `DemoCouponButton.tsx` right next to it in the navbar, rather than
 * introducing a websocket/SSE layer for what's still an MVP-minimal
 * feature. One shared hook covers all three roles since the API
 * route resolves the recipient from the caller's own Cognito token.
 */
export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      if (!mountedRef.current) {
        return;
      }

      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refresh]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/mark-all-read", { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  }

  return { items, unreadCount, loading, markRead, markAllRead, refresh };
}
