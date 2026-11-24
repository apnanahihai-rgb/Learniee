"use client";

import PayoutReviewCard from "@/features/admin/components/PayoutReviewCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminPayoutReview } from "@/features/admin/hooks/usePayoutReview";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

/**
 * Admin "Payout review" (design 15). Every cycle Accounts put ON_HOLD or
 * REJECTED waits here until Admin decides: release to the payment queue,
 * send back to Accounts, or confirm the rejection (final).
 * Data: GET /api/admin/payout-review, decisions: PATCH
 * /api/admin/payout-review/[entryId] (verified Admin auth, Activity Log,
 * live refresh).
 */
export default function AdminPayoutReviewPage() {
  const { entries, loading, error, actingOn, release, reopen, confirmReject } = useAdminPayoutReview();
  const { toast, toastNode } = usePdToast();

  async function decide(run: () => Promise<boolean>, message: string) {
    if (await run()) toast(message);
  }

  const items: AdminQueueItem[] = entries.map((entry) => ({
    id: entry.id,
    // Waiting since Accounts held or rejected it.
    date: entry.verifiedAt ?? entry.transactionDate,
    amount: entry.monthlyTeacherPay,
    searchText: [
      entry.teacherName,
      entry.parentName,
      entry.childName,
      entry.subject,
      entry.holdReason ?? "",
      entry.rejectionReason ?? "",
    ].join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <PayoutReviewCard
        entry={entry}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={actingOn === entry.id}
        onRelease={(id) => void decide(() => release(id), "Released to payment")}
        onReopen={(id) => void decide(() => reopen(id), "Sent back to Accounts")}
        onConfirmReject={(id) => void decide(() => confirmReject(id), "Rejection confirmed")}
      />
    ),
  }));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Money" }]}
        title="Payout review"
        description={`${entries.length} payout${entries.length === 1 ? "" : "s"} Accounts held or rejected, waiting on your decision.`}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading payouts…" />
      ) : entries.length === 0 ? (
        <AdminEmptyState message="Nothing waiting on your review right now." />
      ) : (
        <AdminQueue
          items={items}
          searchPlaceholder="Filter by teacher, parent or reason"
          amountLabel="Teacher pay"
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
