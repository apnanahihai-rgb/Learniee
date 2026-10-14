"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Loads `/api/notifications` on mount and refetches the moment a new
 * notification row is created for this user (live-update stream, see
 * `src/lib/realtimeClient.ts`) — no timer. One shared hook covers all
 * roles since the API route resolves the recipient from the caller's
 * own Cognito token.
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

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useAutoRefresh(() => refresh(), { paths: ["/api/notifications"], staleMs: 15_000 });

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
