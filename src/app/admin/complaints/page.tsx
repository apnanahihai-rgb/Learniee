"use client";

import { useState } from "react";

import ComplaintCard, { complaintDepartmentLabel } from "@/features/admin/components/ComplaintCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminComplaints } from "@/features/admin/hooks/useComplaints";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

type View = "open" | "all";

export default function AdminComplaintsPage() {
  // Data: GET /api/staff/complaints (Admin = every department), updates:
  // PATCH /api/staff/complaints/[complaintId] { status } (verified Admin auth,
  // live refresh, Activity Log). "Open" = Open + In progress.
  const { complaints, loading, error, busyId, markInProgress, resolve, close } =
    useAdminComplaints("/api/staff/complaints");
  const [view, setView] = useState<View>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const { toast, toastNode } = usePdToast();

  const active = complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS");

  async function onInProgress(id: string) {
    if (await markInProgress(id)) toast("Marked in progress");
  }

  async function onResolve(id: string) {
    if (await resolve(id)) toast("Complaint resolved");
  }

  async function onClose(id: string) {
    if (await close(id)) toast("Complaint closed");
  }

  const actions = {
    onInProgress: (id: string) => void onInProgress(id),
    onResolve: (id: string) => void onResolve(id),
    onClose: (id: string) => void onClose(id),
  };

  const queueItems: AdminQueueItem[] = active.map((complaint) => ({
    id: complaint.id,
    group: complaintDepartmentLabel(complaint.department),
    date: complaint.createdAt,
    searchText: [
      complaint.subject,
      complaint.description,
      complaint.raiserName ?? "",
      complaint.raiserEmail ?? "",
    ].join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <ComplaintCard
        complaint={complaint}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={busyId === complaint.id}
        {...actions}
      />
    ),
  }));

  const waiting = active.length;

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Complaints"
        description={
          waiting === 0
            ? "No open complaints right now."
            : `${waiting} open ${waiting === 1 ? "complaint" : "complaints"} waiting on you.`
        }
      />

      <AdminPillTabs
        label="Complaint status"
        value={view}
        onChange={(next) => {
          setView(next);
          setOpenId(null);
        }}
        tabs={[
          { value: "open", label: "Open", count: waiting },
          { value: "all", label: "All history" },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading complaints…" />
      ) : view === "open" ? (
        waiting === 0 ? (
          <AdminEmptyState message="Nothing waiting on you." />
        ) : (
          <AdminQueue items={queueItems} searchPlaceholder="Filter by subject, name or department" />
        )
      ) : complaints.length === 0 ? (
        <AdminEmptyState message="No complaints yet." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {complaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              open={openId === complaint.id}
              onToggle={() => setOpenId(openId === complaint.id ? null : complaint.id)}
              busy={busyId === complaint.id}
              {...actions}
            />
          ))}
        </div>
      )}

      {toastNode}
    </AdminStack>
  );
}
