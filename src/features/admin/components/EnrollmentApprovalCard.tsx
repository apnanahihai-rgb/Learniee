"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import type { AdminEnrollment } from "@/features/admin/hooks/useEnrollments";

interface Props {
  enrollment: AdminEnrollment;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

function displayName(p: { firstName: string; lastName: string; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

export default function EnrollmentApprovalCard({
  enrollment,
  onApprove,
  onReject,
}: Props) {
  const router = useRouter();

  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800">
            {enrollment.course.courseTitle ?? "Untitled course"}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Parent: {displayName(enrollment.parent)} · Teacher:{" "}
            {displayName(enrollment.teacher)} · Child:{" "}
            {enrollment.student.visibleName || enrollment.student.firstName}
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
          Enrollment pending
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-gray-600">
        <p>Sessions/month: <span className="font-semibold">{enrollment.sessionsPerMonth}</span></p>
        <p>Months: <span className="font-semibold">{enrollment.noOfMonths}</span></p>
        <p>
          Start:{" "}
          <span className="font-semibold">
            {new Date(enrollment.cycleStartDate).toLocaleDateString()}
          </span>
        </p>
        <p>Total paid: <span className="font-semibold">₹{enrollment.amountPaid}</span></p>
      </div>

      {enrollment.revisedByTeacher && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">
          Teacher revised this enrollment before forwarding it — Parent has confirmed.
          {enrollment.revisionNote && <> Note: {enrollment.revisionNote}</>}
        </p>
      )}

      {enrollment.pricingChangedAfterPayment && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          ⚠ Revised total (₹{enrollment.totalAmount}) doesn&apos;t match what was
          actually charged (₹{enrollment.amountPaid}) — no automatic
          charge/refund was made. Reconcile manually before approving.
        </p>
      )}

      {enrollment.chatRoom && (
        <button
          type="button"
          onClick={() => router.push(`/admin/chat/${enrollment.chatRoom!.id}`)}
          className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full transition-colors"
        >
          <MessageCircle size={13} />
          View conversation
        </button>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onApprove(enrollment.id)}
          className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() =>
            onReject(enrollment.id, window.prompt("Reason (optional):") || undefined)
          }
          className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
