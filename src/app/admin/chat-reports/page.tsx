"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
  AdminTabs,
  adminButtonClass,
} from "@/features/admin/components/ui/primitives";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import {
  CHAT_SCREEN_REASON_LABELS,
  type ChatScreenReason,
} from "@/features/chat/utils/chatScreening";

interface ChatReportRow {
  id: string;
  status: "OPEN" | "REVIEWED";
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  chatRoomId: string;
  courseTitle: string | null;
  reporterRole: "PARENT" | "TEACHER";
  reporterName: string;
  message: {
    senderRole: "PARENT" | "TEACHER";
    senderName: string;
    body: string;
    originalBody: string | null;
    createdAt: string;
  };
}

interface ChatFlagRow {
  id: string;
  level: "BLOCKED" | "SUSPICIOUS";
  reasons: string[];
  text: string;
  detail: string | null;
  status: "OPEN" | "REVIEWED";
  senderRole: "PARENT" | "TEACHER";
  senderName: string;
  courseTitle: string | null;
  chatRoomId: string;
  createdAt: string;
  reviewedAt: string | null;
}

function reasonLabel(code: string) {
  return CHAT_SCREEN_REASON_LABELS[code as ChatScreenReason] ?? code;
}

function roleLabel(role: "PARENT" | "TEACHER") {
  return role === "PARENT" ? "parent" : "teacher";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminChatReportsPage() {
  const [reports, setReports] = useState<ChatReportRow[]>([]);
  const [flags, setFlags] = useState<ChatFlagRow[]>([]);
  const [source, setSource] = useState<"FLAGS" | "REPORTS">("FLAGS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"OPEN" | "REVIEWED">("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");

      const res = await fetch("/api/admin/chat-reports", { cache: "no-store" });
      const data = await res.json();

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
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/admin/chat-reports"] });

  async function markReviewed(reportId: string) {
    try {
      setBusyId(reportId);
      setError("");

      const res = await fetch(`/api/admin/chat-reports/${reportId}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to update the report.");
      }

      await load();
    } catch (err) {
      console.error("Mark chat report reviewed error:", err);
      setError(err instanceof Error ? err.message : "Failed to update the report.");
    } finally {
      setBusyId(null);
    }
  }

  async function markFlagReviewed(flagId: string) {
    try {
      setBusyId(flagId);
      setError("");

      const res = await fetch(`/api/admin/chat-flags/${flagId}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to update the flag.");
      }

      await load();
    } catch (err) {
      console.error("Mark chat flag reviewed error:", err);
      setError(err instanceof Error ? err.message : "Failed to update the flag.");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = reports.filter((report) => report.status === "OPEN").length;
  const openFlagCount = flags.filter((flag) => flag.status === "OPEN").length;
  const visible = reports.filter((report) => report.status === tab);
  const visibleFlags = flags.filter((flag) => flag.status === tab);

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Reported & flagged messages"
        description="Messages the system flagged for phone numbers, and messages a parent or teacher reported. Nobody involved is told."
      />

      <div>
        <AdminTabs
          label="Message source"
          value={source}
          onChange={setSource}
          tabs={[
            { value: "FLAGS", label: "Flagged by system", count: openFlagCount },
            { value: "REPORTS", label: "Reported by users", count: openCount },
          ]}
        />
      </div>

      <div>
        <AdminTabs
          label="Report status"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "OPEN", label: "Open", count: source === "FLAGS" ? openFlagCount : openCount },
            { value: "REVIEWED", label: "Reviewed" },
          ]}
        />
      </div>

      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading />
      ) : source === "FLAGS" ? (
        visibleFlags.length === 0 ? (
          <AdminEmpty message={tab === "OPEN" ? "No open flags." : "No reviewed flags yet."} />
        ) : (
          <div className="flex flex-col gap-4">
            {visibleFlags.map((flag) => (
              <AdminPanel key={flag.id} padded>
                <article className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[15px] text-admin-muted">
                      <span className="font-extrabold text-admin-ink">{flag.senderName}</span> (
                      {roleLabel(flag.senderRole)}) · {formatDateTime(flag.createdAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminPill tone={flag.level === "BLOCKED" ? "bad" : "warn"}>
                        {flag.level === "BLOCKED" ? "Blocked, not sent" : "Suspicious, was sent"}
                      </AdminPill>
                      {flag.courseTitle && <AdminPill>{flag.courseTitle}</AdminPill>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 rounded-[14px] bg-admin-surface px-4 py-3">
                    <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                      What they typed
                    </span>
                    <p className="whitespace-pre-wrap break-words text-base">{flag.text}</p>
                  </div>

                  <p className="text-[15px]">
                    <span className="font-extrabold">Why:</span>{" "}
                    {flag.reasons.map(reasonLabel).join(", ")}
                    {flag.detail && <span className="text-admin-muted"> — {flag.detail}</span>}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/chat/${flag.chatRoomId}`}
                      className={adminButtonClass("secondary")}
                    >
                      Open conversation
                    </Link>
                    {flag.status === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() => markFlagReviewed(flag.id)}
                        disabled={busyId === flag.id}
                        className={adminButtonClass("primary")}
                      >
                        {busyId === flag.id ? "Saving…" : "Mark reviewed"}
                      </button>
                    ) : (
                      flag.reviewedAt && (
                        <span className="text-sm text-admin-muted">
                          Reviewed {formatDateTime(flag.reviewedAt)}
                        </span>
                      )
                    )}
                  </div>
                </article>
              </AdminPanel>
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <AdminEmpty message={tab === "OPEN" ? "No open reports." : "No reviewed reports yet."} />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((report) => (
            <AdminPanel key={report.id} padded>
              <article className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[15px] text-admin-muted">
                    <span className="font-extrabold text-admin-ink">{report.reporterName}</span> (
                    {roleLabel(report.reporterRole)}) reported a message ·{" "}
                    {formatDateTime(report.createdAt)}
                  </p>
                  {report.courseTitle && <AdminPill>{report.courseTitle}</AdminPill>}
                </div>

                <div className="flex flex-col gap-1 rounded-[14px] bg-admin-surface px-4 py-3">
                  <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-admin-muted">
                    {report.message.senderName} ({roleLabel(report.message.senderRole)}) ·{" "}
                    {formatDateTime(report.message.createdAt)}
                  </span>
                  <p className="whitespace-pre-wrap break-words text-base">{report.message.body}</p>
                  {report.message.originalBody && (
                    <p className="mt-1 whitespace-pre-wrap break-words border-t border-admin-line pt-2 text-sm font-bold text-[#8a6500]">
                      Original (phone number hidden from the other party):{" "}
                      {report.message.originalBody}
                    </p>
                  )}
                </div>

                {report.reason && (
                  <p className="text-[15px]">
                    <span className="font-extrabold">Reason:</span> {report.reason}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/chat/${report.chatRoomId}`}
                    className={adminButtonClass("secondary")}
                  >
                    Open conversation
                  </Link>
                  {report.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => markReviewed(report.id)}
                      disabled={busyId === report.id}
                      className={adminButtonClass("primary")}
                    >
                      {busyId === report.id ? "Saving…" : "Mark reviewed"}
                    </button>
                  ) : (
                    report.reviewedAt && (
                      <span className="text-sm text-admin-muted">
                        Reviewed {formatDateTime(report.reviewedAt)}
                      </span>
                    )
                  )}
                </div>
              </article>
            </AdminPanel>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
