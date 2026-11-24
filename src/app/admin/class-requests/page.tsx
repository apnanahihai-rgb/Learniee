"use client";

import { useState } from "react";

import ClassRequestCard from "@/features/admin/components/ClassRequestCard";
import AdminReasonDialog from "@/features/admin/components/ui/AdminReasonDialog";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import {
  useAdminClassRequests,
  type AdminClassRequest,
} from "@/features/class-requests/hooks/useClassRequests";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { formatClassRequestDate } from "@/features/shared/utils/classRequestStatus";

type Tab = "review" | "open" | "done";

const EMPTY: Record<Tab, string> = {
  review: "No class requests are waiting for review.",
  open: "No open vacancies right now.",
  done: "No rejected or closed requests yet.",
};

export default function AdminClassRequestsPage() {
  // Data: GET /api/admin/class-requests, decisions: PATCH
  // /api/admin/class-requests/[requestId] (verified Admin auth, live refresh).
  // Approve circulates the request to every approved teacher as a vacancy;
  // Reject needs a reason the parent sees; Close ends an open vacancy.
  const { requests, loading, error, busyId, act } = useAdminClassRequests();
  const [tab, setTab] = useState<Tab>("review");
  const [rejecting, setRejecting] = useState<AdminClassRequest | null>(null);
  const { toast, toastNode } = usePdToast();

  const lists: Record<Tab, AdminClassRequest[]> = {
    review: requests.filter((r) => r.status === "PENDING_REVIEW"),
    open: requests.filter((r) => r.status === "OPEN"),
    done: requests.filter((r) => r.status === "REJECTED" || r.status === "CLOSED"),
  };

  async function approve(id: string) {
    if (await act(id, "APPROVE")) toast("Shared with teachers as a vacancy");
  }

  async function closeVacancy(id: string, note?: string) {
    if (await act(id, "CLOSE", note)) toast("Vacancy closed");
  }

  const items: AdminQueueItem[] = lists[tab].map((request) => ({
    id: request.id,
    group: tab === "review" ? request.subject : null,
    date: tab === "open" ? (request.circulatedAt ?? request.createdAt) : request.createdAt,
    searchText: [
      request.title,
      request.subject,
      request.parentName,
      request.parentEmail,
      request.studentName ?? "",
      formatClassRequestDate(request.createdAt),
    ].join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <ClassRequestCard
        request={request}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={busyId === request.id}
        onApprove={(id) => void approve(id)}
        onReject={setRejecting}
        onClose={(id, note) => void closeVacancy(id, note)}
      />
    ),
  }));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Class requests"
        description="Custom classes parents asked for. Approve to share with teachers as a vacancy."
      />

      <AdminPillTabs
        label="Request status"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "review", label: "To review", count: lists.review.length },
          { value: "open", label: "Open vacancies" },
          { value: "done", label: "Rejected / closed" },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading class requests…" />
      ) : items.length === 0 ? (
        <AdminEmptyState message={EMPTY[tab]} />
      ) : (
        <AdminQueue
          key={tab}
          items={items}
          searchPlaceholder="Filter by title, subject or parent"
          countLabel={tab === "review" ? "waiting" : tab === "open" ? "open" : "closed"}
          showWaiting={tab === "review"}
        />
      )}

      {rejecting && (
        <AdminReasonDialog
          title="Reject request"
          description={`“${rejecting.title}” will not be shared with teachers. The parent sees your reason.`}
          label="Reason for the parent"
          hint="Required, 5 to 500 characters. The parent can read it."
          confirmLabel="Reject request"
          danger
          onCancel={() => setRejecting(null)}
          onSubmit={async (reason) => {
            const ok = await act(rejecting.id, "REJECT", reason);

            if (!ok) return "Could not reject this request. Please try again.";

            setRejecting(null);
            toast("Request rejected");

            return null;
          }}
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
