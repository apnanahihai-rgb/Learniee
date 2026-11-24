"use client";

import { useState } from "react";

import RefundRequestCard from "@/features/admin/components/RefundRequestCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import {
  useAdminRefundRequests,
  type AdminRefundRequest,
} from "@/features/refunds/hooks/useRefundRequests";

/**
 * Admin "Refund requests" (design 14). A Parent's request waits here; Approve
 * credits the Parent's Wallet for the amount Admin types (nothing is
 * calculated for him), Reject needs a note the Parent sees.
 * Data: GET /api/admin/refund-requests, decisions: PATCH
 * /api/admin/refund-requests/[requestId] (verified Admin auth, Activity Log,
 * live refresh). See `refundRequest.service.ts` and the Refund Policy (`/refunds`).
 */

type Tab = "PENDING" | "APPROVED" | "REJECTED";

export default function AdminRefundRequestsPage() {
  const { requests, loading, error, notice, busyId, decide } = useAdminRefundRequests();
  const [tab, setTab] = useState<Tab>("PENDING");
  const { toast, toastNode } = usePdToast();

  const byStatus = (status: Tab) => requests.filter((r) => r.status === status);
  const pending = byStatus("PENDING");
  const approved = byStatus("APPROVED");
  const rejected = byStatus("REJECTED");

  async function approve(id: string, amount: number, note?: string) {
    const saved = await decide(id, "APPROVE", {
      approvedAmount: amount,
      ...(note ? { adminNote: note } : {}),
    });

    if (saved) toast("Refund approved, wallet credited");
  }

  async function reject(id: string, note: string) {
    if (await decide(id, "REJECT", { adminNote: note })) toast("Refund rejected");
  }

  function items(list: AdminRefundRequest[], decided: boolean): AdminQueueItem[] {
    return list.map((request) => ({
      id: request.id,
      date: decided ? (request.decidedAt ?? request.createdAt) : request.createdAt,
      amount: decided && request.status === "APPROVED" ? (request.approvedAmount ?? 0) : request.amountPaid,
      searchText: [
        request.parentName,
        request.parentEmail,
        request.invoiceNumber,
        request.reason,
        request.adminNote ?? "",
      ].join(" "),
      render: ({ open, onToggle, waitingTag }) => (
        <RefundRequestCard
          request={request}
          open={open}
          onToggle={onToggle}
          waitingTag={waitingTag}
          busy={busyId === request.id}
          onNotify={toast}
          onApprove={(id, amount, note) => void approve(id, amount, note)}
          onReject={(id, note) => void reject(id, note)}
        />
      ),
    }));
  }


  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Money" }]}
        title="Refund requests"
        description="Approve to credit the parent's wallet, or reject with a note. Nothing is refunded until you approve it."
      />

      <AdminPillTabs
        label="Request status"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "PENDING", label: "To decide", count: pending.length },
          { value: "APPROVED", label: "Approved", count: approved.length },
          { value: "REJECTED", label: "Rejected", count: rejected.length },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-[#efd694] bg-pd-amber-bg px-4 py-3 text-[14px] text-pd-amber"
        >
          {notice}
        </p>
      ) : null}

      {loading ? (
        <AdminLoadingState message="Loading refund requests…" />
      ) : tab === "PENDING" ? (
        pending.length === 0 ? (
          <AdminEmptyState message="No refund requests waiting on you." />
        ) : (
          <AdminQueue
            items={items(pending, false)}
            searchPlaceholder="Filter by parent, invoice or reason"
            amountLabel="Requested"
          />
        )
      ) : (tab === "APPROVED" ? approved : rejected).length === 0 ? (
        <AdminEmptyState
          message={tab === "APPROVED" ? "No approved refunds yet." : "No rejected requests yet."}
        />
      ) : (
        <AdminQueue
          items={items(tab === "APPROVED" ? approved : rejected, true)}
          searchPlaceholder="Filter by parent, invoice or reason"
          amountLabel={tab === "APPROVED" ? "Credited" : "Requested"}
          countLabel="decided"
          showWaiting={false}
          defaultSort="new"
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
