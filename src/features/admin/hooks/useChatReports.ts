"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

export type ChatRole = "PARENT" | "TEACHER";

export interface AdminChatReportRow {
  id: string;
  status: "OPEN" | "REVIEWED";
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  chatRoomId: string;
  courseTitle: string | null;
  reporterRole: ChatRole;
  reporterName: string;
  message: {
    senderRole: ChatRole;
    senderName: string;
    body: string;
    originalBody: string | null;
    createdAt: string;
  };
}

export interface AdminChatFlagRow {
  id: string;
  level: "BLOCKED" | "SUSPICIOUS";
  reasons: string[];
  text: string;
  detail: string | null;
  status: "OPEN" | "REVIEWED";
  senderRole: ChatRole;
  senderName: string;
  courseTitle: string | null;
  chatRoomId: string;
  createdAt: string;
  reviewedAt: string | null;
}

/**
 * Admin's reported and auto-flagged chat messages.
 * Data: GET /api/admin/chat-reports. Decisions: PATCH
 * /api/admin/chat-reports/[reportId] and /api/admin/chat-flags/[flagId]
 * (both verified Admin auth). Refreshes live.
 */
export function useAdminChatReports() {
  const [reports, setReports] = useState<AdminChatReportRow[]>([]);
  const [flags, setFlags] = useState<AdminChatFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");

      const res = await fetch("/api/admin/chat-reports", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to load reported messages.");
      }

      setReports(data.reports ?? []);
      setFlags(data.flags ?? []);
    } catch (err) {
      console.error("Load chat reports error:", err);
      setError(err instanceof Error ? err.message : "Failed to load reported messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/admin/chat-reports"] });

  /** Marks one report or flag reviewed. Returns true on success. */
  const markReviewed = useCallback(
    async (kind: "report" | "flag", id: string) => {
      try {
        setBusyId(id);
        setError("");

        const url =
          kind === "report" ? `/api/admin/chat-reports/${id}` : `/api/admin/chat-flags/${id}`;
        const res = await fetch(url, { method: "PATCH" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Failed to update this item.");
        }

        await load();

        return true;
      } catch (err) {
        console.error("Mark chat item reviewed error:", err);
        setError(err instanceof Error ? err.message : "Failed to update this item.");

        return false;
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return { reports, flags, loading, error, busyId, markReviewed };
}
