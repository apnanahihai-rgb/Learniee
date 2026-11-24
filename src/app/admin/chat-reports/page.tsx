"use client";

import { useState } from "react";

import { ChatFlagCard, ChatReportCard } from "@/features/admin/components/ChatSafetyCards";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminChatReports } from "@/features/admin/hooks/useChatReports";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

type Source = "FLAGS" | "REPORTS";
type Status = "OPEN" | "REVIEWED";

export default function AdminChatReportsPage() {
  // Data: GET /api/admin/chat-reports. "Mark reviewed" = PATCH
  // /api/admin/chat-flags/[flagId] or /api/admin/chat-reports/[reportId]
  // (verified Admin auth, live refresh). Nobody involved is notified.
  const { reports, flags, loading, error, busyId, markReviewed } = useAdminChatReports();
  const [source, setSource] = useState<Source>("FLAGS");
  const [status, setStatus] = useState<Status>("OPEN");
  const { toast, toastNode } = usePdToast();

  const openFlags = flags.filter((f) => f.status === "OPEN").length;
  const openReports = reports.filter((r) => r.status === "OPEN").length;

  async function review(kind: "report" | "flag", id: string) {
    if (await markReviewed(kind, id)) toast("Marked reviewed");
  }

  const items: AdminQueueItem[] =
    source === "FLAGS"
      ? flags
          .filter((flag) => flag.status === status)
          .map((flag) => ({
            id: flag.id,
            group: flag.level === "BLOCKED" ? "Blocked" : "Suspicious",
            date: flag.createdAt,
            searchText: [flag.senderName, flag.text, flag.courseTitle ?? "", flag.reasons.join(" ")].join(" "),
            render: ({ open, onToggle, waitingTag }) => (
              <ChatFlagCard
                flag={flag}
                open={open}
                onToggle={onToggle}
                waitingTag={waitingTag}
                busy={busyId === flag.id}
                onReviewed={() => void review("flag", flag.id)}
              />
            ),
          }))
      : reports
          .filter((report) => report.status === status)
          .map((report) => ({
            id: report.id,
            group: null,
            date: report.createdAt,
            searchText: [
              report.message.senderName,
              report.reporterName,
              report.message.body,
              report.reason ?? "",
              report.courseTitle ?? "",
            ].join(" "),
            render: ({ open, onToggle, waitingTag }) => (
              <ChatReportCard
                report={report}
                open={open}
                onToggle={onToggle}
                waitingTag={waitingTag}
                busy={busyId === report.id}
                onReviewed={() => void review("report", report.id)}
              />
            ),
          }));

  const emptyMessage =
    source === "FLAGS"
      ? status === "OPEN"
        ? "No open flags."
        : "No reviewed flags yet."
      : status === "OPEN"
        ? "No open reports."
        : "No reviewed reports yet.";

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Reported & flagged messages"
        description="Messages the system flagged for phone numbers, and messages a parent or teacher reported. Nobody involved is told."
      />

      <div className="flex flex-col gap-3">
        <AdminPillTabs
          label="Message source"
          value={source}
          onChange={setSource}
          tabs={[
            { value: "FLAGS", label: "Flagged by system", count: openFlags },
            { value: "REPORTS", label: "Reported by users", count: openReports },
          ]}
        />
        <AdminPillTabs
          label="Report status"
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "OPEN", label: "Open", count: source === "FLAGS" ? openFlags : openReports },
            { value: "REVIEWED", label: "Reviewed" },
          ]}
        />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading messages…" />
      ) : items.length === 0 ? (
        <AdminEmptyState message={emptyMessage} />
      ) : (
        <AdminQueue
          key={`${source}-${status}`}
          items={items}
          searchPlaceholder="Filter by name, message or class"
          countLabel={status === "OPEN" ? "waiting" : "reviewed"}
          showWaiting={status === "OPEN"}
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
