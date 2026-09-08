"use client";

import { useMemo, useState } from "react";
import { Calculator, IndianRupee } from "lucide-react";

import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusStyle,
} from "@/features/shared/utils/enrollmentStatus";
import {
  MAX_SESSIONS_PER_MONTH,
  MIN_SESSIONS_PER_MONTH,
  PLATFORM_SHARE,
  TEACHER_SHARE,
  calculateTeacherRateShare,
  splitMonthlyRate,
} from "@/features/shared/utils/teacherRateShare";

/**
 * "Rate Calculator" — previously a sidebar entry with no page behind
 * it (see TeacherSidebar.tsx). Lets a teacher work out their take-home
 * per enrollment using the resolved 70/30 split
 * (06-OPEN-DECISIONS.md #1: Profits = 30% of Monthly_rate, teacher
 * keeps 70% as Monthly_teacher_pay). This is a preview-only tool — no
 * write path, nothing persisted — so it doesn't touch the real
 * Tuition Ledger (`tuitionLedger.service.ts`), which is the
 * authoritative record once a cycle actually completes.
 */

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "teacher" | "platform";
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        emphasis === "teacher"
          ? "bg-green-50 border-green-100"
          : emphasis === "platform"
            ? "bg-violet-50 border-violet-100"
            : "bg-gray-50 border-gray-100"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 font-heading text-lg font-bold ${
          emphasis === "teacher"
            ? "text-green-700"
            : emphasis === "platform"
              ? "text-violet-700"
              : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TeacherRateCalculatorPage() {
  const { enrollments, loading, error } = useTeacherEnrollments();

  const [ratePerSession, setRatePerSession] = useState("500");
  const [sessionsPerMonth, setSessionsPerMonth] = useState("8");
  const [noOfMonths, setNoOfMonths] = useState("1");

  const breakdown = useMemo(
    () =>
      calculateTeacherRateShare({
        ratePerSession: Number(ratePerSession),
        sessionsPerMonth: Number(sessionsPerMonth),
        noOfMonths: Number(noOfMonths),
      }),
    [ratePerSession, sessionsPerMonth, noOfMonths],
  );

  const relevantEnrollments = enrollments.filter(
    (e) => e.status !== "REJECTED" && e.status !== "CANCELLED",
  );

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">
          Growth &amp; Earnings
        </p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
          <Calculator size={20} className="text-brand" />
          Rate calculator
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Estimate your take-home per enrollment. Learnie keeps{" "}
          {PLATFORM_SHARE * 100}% of the monthly rate as its platform fee, you
          keep {TEACHER_SHARE * 100}%.
        </p>
      </div>

      {/* Manual what-if calculator */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm mb-8">
        <h2 className="font-heading text-base font-bold text-gray-800 mb-4">
          Try it out
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <label className="text-xs font-semibold text-gray-600">
            Rate per session (₹)
            <div className="mt-1 flex items-center gap-1 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:border-brand">
              <IndianRupee size={14} className="text-gray-400 flex-shrink-0" />
              <input
                type="number"
                min={0}
                step="1"
                value={ratePerSession}
                onChange={(e) => setRatePerSession(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-gray-800"
              />
            </div>
          </label>

          <label className="text-xs font-semibold text-gray-600">
            Sessions / month
            <input
              type="number"
              min={MIN_SESSIONS_PER_MONTH}
              max={MAX_SESSIONS_PER_MONTH}
              step="1"
              value={sessionsPerMonth}
              onChange={(e) => setSessionsPerMonth(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
            />
          </label>

          <label className="text-xs font-semibold text-gray-600">
            Number of months
            <input
              type="number"
              min={1}
              step="1"
              value={noOfMonths}
              onChange={(e) => setNoOfMonths(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
            />
          </label>
        </div>

        <p className="text-[11px] text-gray-400 mb-4">
          Sessions/month must be a whole number between{" "}
          {MIN_SESSIONS_PER_MONTH} and {MAX_SESSIONS_PER_MONTH} for a real
          enrollment — this calculator won&apos;t stop you going outside
          that, it&apos;s just a preview.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Monthly rate" value={currency.format(breakdown.monthlyRate)} />
          <Stat
            label={`Your monthly pay (${TEACHER_SHARE * 100}%)`}
            value={currency.format(breakdown.monthlyTeacherPay)}
            emphasis="teacher"
          />
          <Stat
            label={`Platform fee (${PLATFORM_SHARE * 100}%)`}
            value={currency.format(breakdown.monthlyPlatformProfit)}
            emphasis="platform"
          />
          <Stat label="Total for cycle" value={currency.format(breakdown.totalAmount)} />
          <Stat
            label="Your total pay"
            value={currency.format(breakdown.totalTeacherPay)}
            emphasis="teacher"
          />
          <Stat
            label="Platform total fee"
            value={currency.format(breakdown.totalPlatformProfit)}
            emphasis="platform"
          />
        </div>
      </div>

      {/* Real enrollments breakdown */}
      <div>
        <h2 className="font-heading text-base font-bold text-gray-800 mb-3">
          Your enrollments
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-violet-50 animate-pulse" />
            ))}
          </div>
        ) : relevantEnrollments.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500">
              No enrollments yet — this fills in once a parent enrolls and
              pays for one of your courses.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantEnrollments.map((e) => {
              const share = splitMonthlyRate(Number(e.monthlyRate), e.noOfMonths);
              const studentName =
                e.student.visibleName?.trim() || e.student.firstName;

              return (
                <div
                  key={e.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-heading text-sm font-bold text-gray-800">
                        {e.course.courseTitle || e.course.subject || "Course"}
                        {" — "}
                        {studentName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {e.sessionsPerMonth} sessions/month · {e.noOfMonths}{" "}
                        month{e.noOfMonths > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${getEnrollmentStatusStyle(
                        e.status,
                      )}`}
                    >
                      {getEnrollmentStatusLabel(e.status, "teacher")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-green-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-green-600">
                        Your pay / month
                      </p>
                      <p className="font-bold text-green-700">
                        {currency.format(share.monthlyTeacherPay)}
                      </p>
                    </div>
                    <div className="bg-violet-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-violet-600">
                        Platform fee / month
                      </p>
                      <p className="font-bold text-violet-700">
                        {currency.format(share.monthlyPlatformProfit)}
                      </p>
                    </div>
                  </div>

                  {e.noOfMonths > 1 && (
                    <p className="mt-2 text-xs text-gray-400">
                      Full cycle: {currency.format(share.totalTeacherPay)} to
                      you · {currency.format(share.totalPlatformProfit)}{" "}
                      platform fee
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
