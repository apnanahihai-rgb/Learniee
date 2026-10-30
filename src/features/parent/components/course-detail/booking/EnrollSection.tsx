"use client";

import { useEffect } from "react";
import { CheckCircle2, Info, Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import CustomDatePicker from "@/features/shared/components/CustomDatePicker";
import {
  availableWeekdays,
  commonStartTimes,
  formatSlotRange,
  formatTime12,
  type AvailabilitySlot,
} from "@/features/shared/utils/availability";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import { formatCycleSummary } from "@/features/shared/utils/cyclePlan";
import type { useEnrollment } from "./useEnrollment";

interface Props {
  enroll: ReturnType<typeof useEnrollment>;
  studentsLoading: boolean;
  studentCount: number;
  availability: AvailabilitySlot[];
  availabilityLoading: boolean;
  /** Session length in minutes (from the course) — a class must fit inside a slot. */
  sessionLengthMinutes: number;
}

export default function EnrollSection({
  enroll,
  studentsLoading,
  studentCount,
  availability,
  availabilityLoading,
  sessionLengthMinutes,
}: Props) {
  const router = useRouter();
  const {
    scheduleMode,
    setScheduleMode,
    customDates,
    toggleCustomDate,
    clearCustomDates,
    scheduleReady,
    startDate,
    setStartDate,
    minStartDate,
    startInPast,
    scheduleDays,
    effectiveScheduleDays,
    toggleScheduleDay,
    scheduleTime,
    setScheduleTime,
    ratePerSession,
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

  const openWeekdays = availableWeekdays(availability);
  const noAvailability = !availabilityLoading && openWeekdays.length === 0;

  // Only times the teacher can teach on EVERY chosen day.
  const validTimes = commonStartTimes(
    availability,
    effectiveScheduleDays,
    sessionLengthMinutes,
  );
  const validTimesKey = validTimes.join(",");

  // A chosen time that stops being valid (days changed) is cleared.
  useEffect(() => {
    if (scheduleTime && !validTimesKey.split(",").includes(scheduleTime)) {
      setScheduleTime("");
    }
  }, [validTimesKey, scheduleTime, setScheduleTime]);

  const timeGroups = [
    { label: "Morning", times: validTimes.filter((t) => t < "12:00") },
    { label: "Afternoon", times: validTimes.filter((t) => t >= "12:00" && t < "17:00") },
    { label: "Evening", times: validTimes.filter((t) => t >= "17:00") },
  ].filter((g) => g.times.length > 0);

  return (
    <>
      {/* ENROLL — one enrollment is one monthly cycle: weekdays +
          time + start date (Part 1A). The session count and total
          are always calculated server-side in enrollment.service.ts;
          this preview is client-side only so the parent sees the
          total before paying. Payment via
          Razorpay is required before the Enrollment row is created
          (resolves 06-OPEN-DECISIONS.md #36); dual approval (Teacher
          + Admin, #2 still open) hasn't been built either, so a paid
          enrollment starts "Pending approval". */}
      <div>
        {noAvailability ? (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
            This teacher hasn&apos;t set their availability yet, so enrollment
            isn&apos;t open right now. Please check back soon.
          </p>
        ) : null}

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            How should classes repeat?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "WEEKDAYS", title: "Repeat weekly", hint: "Pick weekdays; they repeat every week for the month" },
                { value: "DATES", title: "Pick exact dates", hint: "Choose any dates you want within the month" },
              ] as const
            ).map((option) => {
              const active = scheduleMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScheduleMode(option.value)}
                  aria-pressed={active}
                  className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                    active
                      ? "bg-violet-50 border-brand text-brand-dark"
                      : "bg-white border-violet-100 text-gray-600 hover:border-brand/40"
                  }`}
                >
                  <span className="block text-xs font-bold">{option.title}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

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
        </div>

        {scheduleMode === "WEEKDAYS" ? (
          <div className="mb-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Class days (repeat every week)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_LABELS.map((label, day) => {
                const active = scheduleDays.includes(day);
                const closed =
                  !availabilityLoading && !openWeekdays.includes(day);
                const ranges = availability
                  .filter((slot) => slot.dayOfWeek === day)
                  .map(formatSlotRange);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={closed}
                    title={closed ? "Teacher isn't available on this day" : undefined}
                    onClick={() => toggleScheduleDay(day)}
                    className={`flex flex-col items-center min-w-[4.25rem] px-2.5 py-1.5 rounded-xl border transition-colors ${
                      active
                        ? "bg-brand text-white border-brand"
                        : closed
                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                          : "bg-white text-gray-600 border-violet-100 hover:border-brand/40"
                    }`}
                  >
                    <span className="text-xs font-bold">{label}</span>
                    <span
                      className={`text-[10px] leading-tight mt-0.5 ${
                        active ? "text-white/80" : closed ? "text-gray-300" : "text-gray-400"
                      }`}
                    >
                      {closed ? "Off" : ranges.join(", ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Class dates
            </label>
            <CustomDatePicker
              startDateKey={startDate}
              selected={customDates}
              onToggle={toggleCustomDate}
              onClear={clearCustomDates}
            />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Class time (IST)
          </label>

          {!scheduleReady ? (
            <p className="text-xs text-gray-400">
              Pick your class days first — we&apos;ll show the times the teacher is free.
            </p>
          ) : availabilityLoading ? (
            <p className="text-xs text-gray-400">Loading the teacher&apos;s timings…</p>
          ) : validTimes.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              The teacher has no time that works on all the days you picked.
              Remove a day, or choose days with overlapping hours.
            </p>
          ) : (
            <div className="space-y-2.5">
              {timeGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] font-semibold text-gray-400 mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.times.map((t) => {
                      const active = scheduleTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setScheduleTime(t)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            active
                              ? "bg-brand text-white border-brand"
                              : "bg-white text-gray-600 border-violet-100 hover:border-brand/50"
                          }`}
                        >
                          {formatTime12(t)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {startInPast && (
          <p className="text-xs text-red-600 mb-3">
            The start date can&apos;t be in the past.
          </p>
        )}

        {cyclePlan && !startInPast && (
          <div className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
            <p className="font-bold text-gray-800">
              {formatCycleSummary(cyclePlan)}
            </p>
            {planProblem ? (
              <p className="text-red-600">{planProblem}</p>
            ) : (
              pricePreview &&
              ratePerSession && (
                <p>
                  {pricePreview.sessionCount} × ₹
                  {ratePerSession.toLocaleString("en-IN")} ={" "}
                  <span className="font-bold text-gray-800">
                    ₹{pricePreview.totalAmount.toLocaleString("en-IN")}
                  </span>
                </p>
              )
            )}
          </div>
        )}

        {enrollError && (
          <p className="text-xs text-red-600 mb-2">{enrollError}</p>
        )}

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
          disabled={
            enrolling ||
            noAvailability ||
            studentsLoading ||
            studentCount === 0 ||
            !scheduleReady ||
            !scheduleTime ||
            !startDate ||
            startInPast ||
            !cyclePlan ||
            !!planProblem
          }
          title={
            !scheduleReady || !scheduleTime
              ? "Pick class days/dates and time first"
              : startInPast || !startDate
                ? "Pick a start date that isn't in the past"
                : planProblem
                  ? planProblem
                  : undefined
          }
          className="w-full text-sm font-bold text-white bg-brand-dark px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {enrolling && <Loader2 size={14} className="animate-spin" />}
          {pricePreview
            ? `Pay ₹${pricePreview.totalAmount.toLocaleString("en-IN")} & Enroll`
            : "Enroll Now"}
        </button>

        {pricePreview && walletBalance !== null && walletBalance >= pricePreview.totalAmount && (
          <button
            type="button"
            onClick={handleEnrollWithWallet}
            disabled={
              enrolling ||
              studentsLoading ||
              studentCount === 0 ||
              !scheduleReady ||
              !scheduleTime ||
              !startDate ||
              startInPast ||
              !cyclePlan ||
              !!planProblem
            }
            className="w-full mt-2 text-sm font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {`Pay ₹${pricePreview.totalAmount.toLocaleString("en-IN")} from wallet (₹${walletBalance.toLocaleString("en-IN")} available)`}
          </button>
        )}

        {pricePreview && walletBalance !== null && walletBalance >= 1 && walletBalance < pricePreview.totalAmount && (
          <button
            type="button"
            onClick={handleEnrollPartWallet}
            disabled={
              enrolling ||
              studentsLoading ||
              studentCount === 0 ||
              !scheduleReady ||
              !scheduleTime ||
              !startDate ||
              startInPast ||
              !cyclePlan ||
              !!planProblem
            }
            className="w-full mt-2 text-sm font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {`Use ₹${walletBalance.toLocaleString("en-IN")} from wallet + pay the rest by card`}
          </button>
        )}


        <p className="flex items-start gap-2 mt-3 text-[11px] text-gray-400 leading-relaxed">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Payment is collected via Razorpay before your enrollment is
          created. After that, it&apos;s waiting for teacher approval —
          you&apos;ll be able to track it and chat with your teacher from
          &quot;My Classes&quot;.
        </p>
      </div>
    </>
  );
}
