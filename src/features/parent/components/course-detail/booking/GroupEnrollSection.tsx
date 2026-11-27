"use client";

import { CheckCircle2, Info, Loader2, MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import type { GroupBookingInfo } from "@/features/courses/utils/groupClass";
import { formatTime12 } from "@/features/shared/utils/availability";
import { formatCycleSummary } from "@/features/shared/utils/cyclePlan";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import type { useEnrollment } from "./useEnrollment";

interface Props {
  enroll: ReturnType<typeof useEnrollment>;
  group: GroupBookingInfo;
  studentsLoading: boolean;
  studentCount: number;
}

const formatDay = (key: string | null) =>
  key
    ? new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "?";

/**
 * Enroll step for a group class. Same payment flow as an individual
 * enrollment (card, Wallet part-payment, Wallet-only) — but the teacher
 * has already fixed the days, time and price, so the parent only chooses
 * the child (above) and, for an open group, a start date.
 */
export default function GroupEnrollSection({
  enroll,
  group,
  studentsLoading,
  studentCount,
}: Props) {
  const router = useRouter();
  const {
    startDate,
    setStartDate,
    minStartDate,
    startInPast,
    cyclePlan,
    planProblem,
    pricePreview,
    enrolling,
    enrollError,
    enrollSuccess,
    enrollChatRoomId,
    handleEnroll,
    handleEnrollWithWallet,
    handleEnrollPartWallet,
    walletBalance,
  } = enroll;

  const timeBound = group.mode === "TIME_BOUND";
  const seatsLeft = group.maxStudents === null ? null : Math.max(group.maxStudents - group.seatsTaken, 0);
  const full = seatsLeft === 0;
  // A time-bound group closes to new students once it has started.
  const closed = timeBound && startInPast;

  const cannotPay =
    enrolling ||
    studentsLoading ||
    studentCount === 0 ||
    full ||
    closed ||
    !startDate ||
    startInPast ||
    !cyclePlan ||
    !!planProblem;

  const total = pricePreview?.totalAmount ?? group.pricePerCycle;

  return (
    <div>
      <div className="rounded-xl bg-violet-50 px-3 py-2.5 mb-3 text-xs text-gray-600 space-y-1">
        <p className="font-bold text-gray-800 flex items-center gap-1.5">
          <Users size={13} /> Group class
          {seatsLeft !== null && (
            <span className="font-semibold text-gray-600">
              · {full ? "No seats left" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
            </span>
          )}
        </p>
        <p>
          {group.days.map((d) => WEEKDAY_LABELS[d]).join(", ")} at {formatTime12(group.time)} (IST)
        </p>
        <p>
          {timeBound
            ? `Fixed batch: ${formatDay(group.startDate)} – ${formatDay(group.endDate)}`
            : "Open group — join any time"}
        </p>
        <p>
          <span className="font-bold text-gray-800">₹{group.pricePerCycle.toLocaleString("en-IN")}</span> per
          month, same for every student
        </p>
      </div>

      {full && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          This group is full right now. Please check back later.
        </p>
      )}

      {closed && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          This group has already started, so new students can&apos;t join.
        </p>
      )}

      {!timeBound && (
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Start date
          </label>
          <input
            type="date"
            min={minStartDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {startInPast && <p className="text-xs text-red-600 mt-1">The start date can&apos;t be in the past.</p>}
        </div>
      )}

      {cyclePlan && !startInPast && (
        <div className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
          <p className="font-bold text-gray-800">{formatCycleSummary(cyclePlan)}</p>
          {planProblem && <p className="text-red-600">{planProblem}</p>}
        </div>
      )}

      {enrollError && <p className="text-xs text-red-600 mb-2">{enrollError}</p>}

      {enrollSuccess && (
        <div className="mb-2">
          <div className="flex items-start gap-2 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            {enrollSuccess}
          </div>

          {enrollChatRoomId && (
            <button
              type="button"
              onClick={() => router.push(`/parent/chat/${enrollChatRoomId}`)}
              className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-full transition-colors"
            >
              <MessageCircle size={14} />
              Chat with your teacher
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleEnroll}
        disabled={cannotPay}
        className="w-full text-sm font-bold text-white bg-brand-dark px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {enrolling && <Loader2 size={14} className="animate-spin" />}
        {`Pay ₹${total.toLocaleString("en-IN")} & Join group`}
      </button>

      {pricePreview && walletBalance !== null && walletBalance >= pricePreview.totalAmount && (
        <button
          type="button"
          onClick={handleEnrollWithWallet}
          disabled={cannotPay}
          className="w-full mt-2 text-sm font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {`Pay ₹${pricePreview.totalAmount.toLocaleString("en-IN")} from wallet (₹${walletBalance.toLocaleString("en-IN")} available)`}
        </button>
      )}

      {pricePreview && walletBalance !== null && walletBalance >= 1 && walletBalance < pricePreview.totalAmount && (
        <button
          type="button"
          onClick={handleEnrollPartWallet}
          disabled={cannotPay}
          className="w-full mt-2 text-sm font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {`Use ₹${walletBalance.toLocaleString("en-IN")} from wallet + pay the rest by card`}
        </button>
      )}

      <p className="flex items-start gap-2 mt-3 text-[11px] text-gray-400 leading-relaxed">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        Payment is collected via Razorpay before your child is added to the group. After that it&apos;s waiting for
        teacher approval — you can track it and chat with your teacher from &quot;My Classes&quot;.
      </p>
    </div>
  );
}
