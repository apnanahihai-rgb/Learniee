"use client";

import { CheckCircle2, Info, Loader2, MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ageFitsGroup,
  GROUP_MIN_CLASSES_LEFT,
  groupClassesLeft,
  groupRegistrationState,
  resolveGroupStartDate,
  type GroupBookingInfo,
} from "@/features/courses/utils/groupClass";
import { formatTime12 } from "@/features/shared/utils/availability";
import { formatCycleSummary } from "@/features/shared/utils/cyclePlan";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import { todayInPlatformTz } from "@/lib/platformTime";
import type { useEnrollment } from "./useEnrollment";

interface Props {
  enroll: ReturnType<typeof useEnrollment>;
  group: GroupBookingInfo;
  studentsLoading: boolean;
  studentCount: number;
  /** Age of the selected child (null = none picked / unknown). */
  studentAge: number | null;
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
  studentAge,
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
  const monthlyFixed = group.joinMode === "MONTHLY_FIXED";
  const anytime = group.joinMode === "ANYTIME";
  const seatsLeft = group.maxStudents === null ? null : Math.max(group.maxStudents - group.seatsTaken, 0);
  const full = seatsLeft === 0;
  // Registration closes on the teacher's end date, or earlier (the day before the
  // last 4 classes) for a one-time group that allows mid-way joining.
  const registration = groupRegistrationState(group.regStartDate, group.lastRegistrationDate);
  const registrationOpen = registration === "OPEN";
  // Only flag a mismatch once a child is picked.
  const ageMismatch =
    studentAge !== null && !ageFitsGroup(studentAge, group.ageMin, group.ageMax);
  // Groups from before the joining option existed close once started; the
  // newer ones close only when their last batch is over.
  const joinCheck = resolveGroupStartDate({
    mode: group.mode,
    joinMode: group.joinMode,
    groupStartDate: group.startDate,
    groupEndDate: group.endDate,
    requested: startDate,
    today: todayInPlatformTz(),
    days: group.days,
  });
  const joinFailed = !!group.joinMode && !joinCheck.ok;
  // Mid-way joining: fewer than 4 classes left from the chosen start date.
  const tooFewLeft = joinFailed && !joinCheck.ok && joinCheck.reason === "TOO_FEW_LEFT";
  const ended = joinFailed && !tooFewLeft;
  const closed = (timeBound && !group.joinMode && startInPast) || joinFailed;
  const midwayJoin = timeBound && !!group.joinMode;
  const joiningMidway = midwayJoin && !!group.startDate && !!startDate && startDate > group.startDate;
  const classesLeft = joiningMidway ? groupClassesLeft(group.days, startDate, group.endDate) : null;
  const closesEarly =
    midwayJoin &&
    !!group.lastRegistrationDate &&
    group.lastRegistrationDate !== group.regEndDate &&
    group.lastRegistrationDate >= (group.regStartDate ?? "");
  // Earliest date the date picker allows (a time-bound group can't be joined before it starts).
  const pickerMin = timeBound && group.startDate && group.startDate > minStartDate ? group.startDate : minStartDate;
  // Latest start that still leaves 4 classes (mid-way joining), else the group's end.
  const pickerMax = timeBound && group.endDate ? (group.lastStartDate ?? group.endDate) : undefined;
  // The parent picks the date for an open group, and for any "anytime" group.
  const showDatePicker = anytime || (!timeBound && !group.joinMode);

  const cannotPay =
    enrolling ||
    studentsLoading ||
    studentCount === 0 ||
    full ||
    !registrationOpen ||
    ageMismatch ||
    closed ||
    !startDate ||
    startInPast ||
    !cyclePlan ||
    !!planProblem;

  const total = pricePreview?.totalAmount ?? group.pricePerSession;

  return (
    <div>
      <div className="rounded-xl bg-violet-50 px-3 py-2.5 mb-3 text-xs text-gray-600 space-y-1">
        <p className="font-bold text-gray-800 flex items-center gap-1.5">
          <Users size={13} /> Group class
          {seatsLeft !== null && (
            <span className="font-semibold text-gray-600">
              · {full ? "Full" : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
            </span>
          )}
        </p>
        {group.ageMin != null && group.ageMax != null && <p>For ages {group.ageMin}–{group.ageMax}</p>}
        {group.regStartDate && (
          <p>
            Registration: {formatDay(group.regStartDate)}
            {group.regEndDate ? ` – ${formatDay(group.regEndDate)}` : " onwards"}
          </p>
        )}
        {closesEarly && (
          <p>
            Registration closes automatically on {formatDay(group.lastRegistrationDate)}, before the last{" "}
            {GROUP_MIN_CLASSES_LEFT} classes.
          </p>
        )}
        <p>
          {group.days.map((d) => WEEKDAY_LABELS[d]).join(", ")} at {formatTime12(group.time)} (IST)
        </p>
        <p>
          {timeBound
            ? `Fixed batch: ${formatDay(group.startDate)} – ${formatDay(group.endDate)}`
            : "Open group"}
        </p>
        {monthlyFixed && <p>Monthly fixed — you join at the start of a monthly batch.</p>}
        {anytime && !midwayJoin && <p>Anytime — join on any date you choose.</p>}
        {midwayJoin && (
          <p>
            Mid-way joining allowed — you pay only for the classes still left. Nobody can join when fewer than{" "}
            {GROUP_MIN_CLASSES_LEFT} are left.
          </p>
        )}
        {!group.joinMode && !timeBound && <p>Join any time.</p>}
        <p>
          <span className="font-bold text-gray-800">₹{group.pricePerSession.toLocaleString("en-IN")}</span> per
          session, charged for the sessions in your cycle
        </p>
      </div>

      {full && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          Full — this group has no seats left right now. Please check back later.
        </p>
      )}

      {registration === "NOT_OPEN" && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          Registration opens on {formatDay(group.regStartDate)}.
        </p>
      )}

      {registration === "CLOSED" && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          Registration for this group has closed.
        </p>
      )}

      {ageMismatch && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          This group is for ages {group.ageMin}–{group.ageMax}. Pick a child in that age range.
        </p>
      )}

      {closed && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          {tooFewLeft
            ? `Fewer than ${GROUP_MIN_CLASSES_LEFT} classes are left from that date, so new students can't join. Pick an earlier start date.`
            : ended
              ? "This group has ended, so new students can't join."
              : "This group has already started, so new students can't join."}
        </p>
      )}

      {monthlyFixed && !closed && (
        <p className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3">
          Your child joins the next batch, starting{" "}
          <span className="font-bold text-gray-800">{formatDay(startDate)}</span>. Classes begin on that date.
        </p>
      )}

      {joiningMidway && !closed && classesLeft !== null && (
        <p className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3">
          This group has already started. {classesLeft} class{classesLeft === 1 ? "" : "es"} left from{" "}
          <span className="font-bold text-gray-800">{formatDay(startDate)}</span> — you pay only for the classes
          from your start date, not the ones already held.
        </p>
      )}

      {showDatePicker && (
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Start date
          </label>
          <input
            type="date"
            min={pickerMin}
            max={pickerMax}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value && e.target.value < pickerMin ? pickerMin : e.target.value)}
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
