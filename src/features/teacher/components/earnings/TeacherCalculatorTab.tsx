"use client";

import { useMemo, useState } from "react";

import PdField from "@/features/parent/components/account/PdField";
import { PD_INPUT } from "@/features/parent/components/courses/pdUi";
import { formatInr } from "@/features/teacher/components/earnings/earningsLogic";
import {
  PLATFORM_SHARE,
  TEACHER_SHARE,
  calculateTeacherRateShare,
} from "@/features/shared/utils/teacherRateShare";

const pct = (share: number) => Math.round(share * 100);

/** Teacher Earnings → Rate calculator: what a cycle at a given price and session count pays you. Preview only. */
export default function TeacherCalculatorTab() {
  const [price, setPrice] = useState("500");
  const [sessions, setSessions] = useState("8");

  const result = useMemo(
    () =>
      calculateTeacherRateShare({
        ratePerSession: Number(price),
        sessionsPerMonth: Number(sessions),
        noOfMonths: 1,
      }),
    [price, sessions],
  );

  return (
    <div className="mt-5 grid gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_340px] min-[900px]:items-start">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex min-w-0 flex-col gap-5 rounded-2xl border border-pd-line bg-white p-5"
      >
        <h2 className="text-[17px] font-semibold text-pd-ink">Estimate a cycle</h2>

        <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
          <PdField id="calc-price" label="Price per session (₹)">
            <input
              id="calc-price"
              type="number"
              min={0}
              inputMode="decimal"
              className={PD_INPUT}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </PdField>
          <PdField id="calc-sessions" label="Sessions in the cycle">
            <input
              id="calc-sessions"
              type="number"
              min={1}
              inputMode="numeric"
              className={PD_INPUT}
              value={sessions}
              onChange={(e) => setSessions(e.target.value)}
            />
          </PdField>
        </div>

        <p className="text-xs text-pd-ink3">
          You set your own price per session. Minimum 4 sessions in a monthly cycle, 1 in a weekly one.
        </p>
      </form>

      <section
        aria-live="polite"
        className="flex min-w-0 flex-col gap-1.5 rounded-[18px] border border-pd-line bg-white p-[18px]"
      >
        <span className="text-[13px] font-semibold text-pd-ink3">You earn</span>
        <div className="font-heading text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-pd-ink">
          {formatInr(result.monthlyTeacherPay)}
        </div>

        <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-pd-b100" aria-hidden="true">
          <i className="block h-full bg-pd-brand" style={{ width: `${pct(TEACHER_SHARE)}%` }} />
          <i className="block h-full bg-pd-gold" style={{ width: `${pct(PLATFORM_SHARE)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[13px] text-pd-ink2">
          <span>You · {pct(TEACHER_SHARE)}%</span>
          <span>Learniee · {pct(PLATFORM_SHARE)}%</span>
        </div>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-bold text-pd-ink3">Parent pays</dt>
          <dd className="text-right font-bold text-pd-ink">{formatInr(result.monthlyRate)}</dd>
          <dt className="font-bold text-pd-ink3">Learniee share</dt>
          <dd className="text-right font-bold text-pd-ink">{formatInr(result.monthlyPlatformProfit)}</dd>
        </dl>
      </section>
    </div>
  );
}
