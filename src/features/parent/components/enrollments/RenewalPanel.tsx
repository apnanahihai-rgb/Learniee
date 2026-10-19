"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useRenewal } from "@/features/parent/hooks/useRenewal";
import CustomDatePicker from "@/features/shared/components/CustomDatePicker";
import { weekdaysOfDateKeys } from "@/features/shared/utils/cyclePlan";
import { WEEKDAY_LABELS, formatScheduleTime, toggleWeekday } from "@/features/shared/utils/weekdays";

export interface RenewalRecap {
  /** Classes counted so far in the cycle that is ending. */
  attended: number;
  /** Classes planned in that cycle. */
  total: number;
  /** Cycles finished before this one. */
  cyclesCompleted: number;
}

interface Props {
  enrollmentId: string;
  onRenewed?: () => void;
  /** Mini recap shown above the Renew form so renewing feels earned. */
  recap?: RenewalRecap;
}

/**
 * Money and Renewal, Part 2B §2. Only rendered for an ACTIVE,
 * non-legacy enrollment (see EnrollmentStatusCard) — shows nothing
 * once outside the renewal window, and nothing at all once already
 * renewed (a next cycle exists) since the Enrollment just keeps
 * going with no further action needed.
 */
export default function RenewalPanel({ enrollmentId, onRenewed, recap }: Props) {
  const { status, loading, paying, error, renew, renewWithWallet, walletBalance } =
    useRenewal(enrollmentId);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (status?.preview) {
      setScheduleDays(status.preview.scheduleDays);
      setCustomDates(status.preview.customDates ?? []);
      setScheduleTime(status.preview.scheduleTime);
    } else if (status) {
      setScheduleDays(status.currentScheduleDays);
      setScheduleTime(status.currentScheduleTime ?? "");
    }
  }, [status]);

  if (loading || !status || status.alreadyRenewed || !status.eligible) {
    return null;
  }

  function toggleDay(day: number) {
    setScheduleDays((current) => toggleWeekday(current, day));
  }

  function toggleDate(dateKey: string) {
    setCustomDates((current) =>
      current.includes(dateKey)
        ? current.filter((key) => key !== dateKey)
        : [...current, dateKey].sort(),
    );
  }

  const isCustom = status.isCustomPlan;
  // What the renew requests send: exact dates on the "Complete month plan",
  // otherwise the repeating weekdays.
  const overrides = isCustom
    ? {
        scheduleDays: weekdaysOfDateKeys(customDates),
        scheduleTime,
        customDates,
      }
    : { scheduleDays, scheduleTime };
  const scheduleReady = isCustom ? customDates.length > 0 : scheduleDays.length > 0;

  async function handleRenew() {
    setMessage(null);
    const result = await renew(overrides);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) onRenewed?.();
  }

  async function handleRenewPartWallet() {
    setMessage(null);
    const result = await renew(overrides, { useWallet: true });
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) onRenewed?.();
  }

  async function handleRenewWithWallet() {
    setMessage(null);
    const result = await renewWithWallet(overrides);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) onRenewed?.();
  }

  const preview = status.preview;
  // Nothing changed from the schedule already running → one-tap wording.
  const sameSchedule =
    !isCustom &&
    scheduleTime === (status.currentScheduleTime ?? "") &&
    [...scheduleDays].sort().join(",") === [...status.currentScheduleDays].sort().join(",");
  // The wallet pays the base price (no card surcharge), all of it or not at all.
  const canPayPartWallet =
    !!preview && walletBalance !== null && walletBalance >= 1 && walletBalance < preview.totalAmount;
  const canPayWithWallet =
    !!preview && walletBalance !== null && walletBalance >= preview.totalAmount;

  return (
    <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw size={13} className="text-violet-700" />
        <p className="text-xs font-bold text-violet-800">
          Renew cycle {status.currentCycleNumber + 1}
        </p>
      </div>

      {recap && (
        <p className="text-[11px] text-violet-700 mb-3">
          {recap.attended} of {recap.total} classes attended this cycle
          {recap.cyclesCompleted > 0
            ? ` · ${recap.cyclesCompleted} earlier cycle${recap.cyclesCompleted === 1 ? "" : "s"} completed`
            : ""}
          . Keep the momentum going.
        </p>
      )}

      {isCustom ? (
        <div className="mb-2">
          <CustomDatePicker
            startDateKey={status.nextCycleStartKey}
            selected={customDates}
            onToggle={toggleDate}
          />
        </div>
      ) : (
        <div className="flex gap-1.5 mb-2">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`text-[11px] font-semibold w-8 h-8 rounded-full transition-colors ${
                scheduleDays.includes(day)
                  ? "bg-brand text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {label[0]}
            </button>
          ))}
        </div>
      )}

      <input
        type="time"
        value={scheduleTime}
        onChange={(e) => setScheduleTime(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2"
      />

      {preview && (
        <p className="text-[11px] text-violet-700 mb-2">
          {isCustom
            ? `${customDates.length} sessions from ${preview.cycleStartKey} · ₹${(
                customDates.length * preview.ratePerSession
              ).toLocaleString("en-IN")}`
            : `${preview.sessionCount} sessions from ${preview.cycleStartKey} · ₹${preview.amountPayable.toLocaleString("en-IN")}${
                preview.isInternationalPayment ? " (incl. surcharge)" : ""
              }`}
          {scheduleTime ? ` · ${formatScheduleTime(scheduleTime)}` : ""}
        </p>
      )}

      {(error || message) && (
        <p className={`text-[11px] mb-2 ${message?.ok ? "text-green-700" : "text-red-600"}`}>
          {message?.text ?? error}
        </p>
      )}

      <button
        type="button"
        onClick={handleRenew}
        disabled={paying || !scheduleReady || !scheduleTime}
        className="text-xs font-bold text-white bg-brand px-3 py-1.5 rounded-full disabled:opacity-50"
      >
        {paying ? "Processing…" : sameSchedule ? "Renew same schedule" : "Renew & Pay"}
      </button>

      {canPayPartWallet && (
        <button
          type="button"
          onClick={handleRenewPartWallet}
          disabled={paying || !scheduleReady || !scheduleTime}
          className="ml-2 text-xs font-bold text-violet-800 bg-white border border-violet-200 px-3 py-1.5 rounded-full disabled:opacity-50"
        >
          {`Use ₹${walletBalance?.toLocaleString("en-IN")} from wallet + card`}
        </button>
      )}

      {canPayWithWallet && preview && (
        <button
          type="button"
          onClick={handleRenewWithWallet}
          disabled={paying || !scheduleReady || !scheduleTime}
          className="ml-2 text-xs font-bold text-violet-800 bg-white border border-violet-200 px-3 py-1.5 rounded-full disabled:opacity-50"
        >
          {`Pay ₹${preview.totalAmount.toLocaleString("en-IN")} from wallet`}
        </button>
      )}
    </div>
  );
}
