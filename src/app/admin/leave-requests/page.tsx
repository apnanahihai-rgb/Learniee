"use client";

import { useState } from "react";

import LeaveRequestCard from "@/features/admin/components/LeaveRequestCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminLeaveRequests } from "@/features/admin/hooks/useLeaveRequests";
import { formatLeaveRange } from "@/features/admin/utils/leaveDates";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { displayName } from "@/features/shared/utils/displayName";

type View = "pending" | "all";

export default function AdminLeaveRequestsPage() {
  // Data: GET /api/admin/leave-requests (every request, with the "if approved"
  // impact on pending ones), decisions: PATCH /api/admin/leave-requests/[requestId]
  // (verified Admin auth, live refresh). Approving moves or excuses the
  // teacher's classes inside the leave.
  const { requests, loading, error, busyId, approve, reject } = useAdminLeaveRequests();
  const [view, setView] = useState<View>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const { toast, toastNode } = usePdToast();

  const pending = requests.filter((r) => r.status === "PENDING");

  async function onApprove(id: string) {
    if (await approve(id)) toast("Leave approved");
  }

  async function onReject(id: string, reason?: string) {
    if (await reject(id, reason)) toast("Leave rejected");
  }

  const queueItems: AdminQueueItem[] = pending.map((request) => {
    const name = displayName(request.teacher);

    return {
      id: request.id,
      group: request.isEmergency ? "Emergency" : "Planned",
      date: request.createdAt,
      searchText: [
        name,
        request.teacher.email,
        request.reason,
        formatLeaveRange(request.startDate, request.endDate),
      ].join(" "),
      render: ({ open, onToggle, waitingTag }) => (
        <LeaveRequestCard
          request={request}
          open={open}
          onToggle={onToggle}
          waitingTag={waitingTag}
          busy={busyId === request.id}
          onApprove={(id) => void onApprove(id)}
          onReject={(id, reason) => void onReject(id, reason)}
        />
      ),
    };
  });

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Leave requests"
        description="Approve or reject teacher leave. Approving moves their classes to new slots."
      />

      <AdminPillTabs
        label="Leave status"
        value={view}
        onChange={(next) => {
          setView(next);
          setOpenId(null);
        }}
        tabs={[
          { value: "pending", label: "Pending", count: pending.length },
          { value: "all", label: "All history" },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading leave requests…" />
      ) : view === "pending" ? (
        pending.length === 0 ? (
          <AdminEmptyState message="Nothing waiting on your approval." />
        ) : (
          <AdminQueue
            items={queueItems}
            searchPlaceholder="Filter by teacher, reason or dates"
          />
        )
      ) : requests.length === 0 ? (
        <AdminEmptyState message="No leave requests yet." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {requests.map((request) => (
            <LeaveRequestCard
              key={request.id}
              request={request}
              open={openId === request.id}
              onToggle={() => setOpenId(openId === request.id ? null : request.id)}
              busy={busyId === request.id}
              onApprove={(id) => void onApprove(id)}
              onReject={(id, reason) => void onReject(id, reason)}
            />
          ))}
        </div>
      )}

      {toastNode}
    </AdminStack>
  );
}
