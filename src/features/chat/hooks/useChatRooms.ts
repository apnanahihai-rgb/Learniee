"use client";

import { useCallback, useEffect, useState } from "react";

import type { ChatRoomSummary } from "@/features/chat/types/chat";

const ROOM_LIST_POLL_MS = 15000;

/**
 * Fetches a role's chat room list from `endpoint` and polls it every
 * ROOM_LIST_POLL_MS so unread-message counts / new rooms show up
 * without a manual refresh. `endpoint` already includes any query
 * string (e.g. admin filters) — this hook doesn't build one.
 */
export function useChatRooms(endpoint: string) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRooms = useCallback(async () => {
    try {
      setError("");

      const res = await fetch(endpoint, { method: "GET", cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load chat rooms.");
      }

      setRooms(data.rooms ?? []);
    } catch (err) {
      console.error("Load chat rooms error:", err);
      setError(err instanceof Error ? err.message : "Failed to load chat rooms.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setLoading(true);
    loadRooms();

    const interval = setInterval(loadRooms, ROOM_LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [loadRooms]);

  return { rooms, loading, error, refresh: loadRooms };
}
