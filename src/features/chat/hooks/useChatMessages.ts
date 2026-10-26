"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/features/chat/types/chat";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

/**
 * Merges `incoming` into `prev`, de-duping by `id`. Needed because a
 * live refresh and the optimistic append in `sendMessage` can race: a fetch
 * request in flight when a message is sent may resolve afterwards and
 * still include that same message (it was fetched with a stale `after`
 * cursor), producing a duplicate entry/key otherwise.
 */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/**
 * Fetches a single room's messages via `messagesEndpoint` (e.g.
 * `/api/parent/chat/<roomId>/messages`), using the `after` query param
 * so each refresh only asks for messages newer than the last one
 * already held — see the matching GET routes.
 *
 * New messages arrive through the live-update stream
 * (`src/lib/realtimeClient.ts` → `useAutoRefresh`): a chat-message row
 * being written triggers one `poll()` — no timer. `staleMs` is short so
 * coming back to a chat tab always catches up.
 *
 * `sendMessage` is a no-op when `canSend` is false (Admin's read-only
 * view).
 */
export function useChatMessages(messagesEndpoint: string, canSend: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const lastTimestampRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const after = lastTimestampRef.current;
      const url = after
        ? `${messagesEndpoint}?after=${encodeURIComponent(after)}`
        : messagesEndpoint;

      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }

      const incoming: ChatMessage[] = data.messages ?? [];

      if (incoming.length > 0) {
        setMessages((prev) => (after ? mergeMessages(prev, incoming) : incoming));
        lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
      }

      setError("");
    } catch (err) {
      console.error("Load chat messages error:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [messagesEndpoint]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastTimestampRef.current = null;

    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesEndpoint]);

  useAutoRefresh(() => poll(), { paths: [messagesEndpoint], staleMs: 5_000 });

  /** Resolves true when the message was sent, false when it failed or was refused (the reason is in `error`). */
  async function sendMessage(body: string): Promise<boolean> {
    if (!canSend) return false;

    try {
      setSending(true);
      setError("");

      const res = await fetch(messagesEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setMessages((prev) => mergeMessages(prev, [data.message]));
      lastTimestampRef.current = data.message.createdAt;
      return true;
    } catch (err) {
      console.error("Send chat message error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message.");
      return false;
    } finally {
      setSending(false);
    }
  }

  /**
   * Reports a message from the other person to Admin. Throws with the
   * server's message on failure so the caller (ChatWindow) can show it
   * next to the message instead of in the page-level error bar.
   */
  async function reportMessage(messageId: string, reason?: string) {
    const res = await fetch(`${messagesEndpoint}/${encodeURIComponent(messageId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to report the message.");
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, reportedByMe: true } : message,
      ),
    );
  }

  return { messages, loading, error, sending, sendMessage, reportMessage };
}