"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";

import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import {
  Notice,
  SectionTitle,
  SumCard,
} from "@/features/teacher/components/earnings/EarningsUi";
import {
  LEDGER_STATUS,
  RECORD_STATUS,
  formatInr,
  formatPayoutDate,
  ledgerReason,
  summariseEarnings,
} from "@/features/teacher/components/earnings/earningsLogic";
import { RequestsError, RequestsSkeleton } from "@/features/teacher/components/requests/RequestsUi";
import { useTeacherEarnings } from "@/features/teacher/hooks/useTeacherEarnings";
import { TEACHER_SHARE } from "@/features/shared/utils/teacherRateShare";

const TH = "whitespace-nowrap border-b border-pd-line px-4 py-3 text-left text-xs font-semibold text-pd-ink3";
const TD = "border-b border-pd-line px-4 py-3 align-top group-last:border-b-0";

const BANK_NOTICE = {
  NONE: "You haven’t added a bank account yet. Nothing can be paid out until you do.",
  PENDING: "Your bank account is waiting for Admin approval. Payouts can’t reach you until it’s approved.",
  REJECTED: "Your bank account was rejected. Resubmit it before a payout can reach you.",
} as const;

/** Teacher Earnings → Earnings: summary cards and the cycle-by-cycle payout table. */
export default function TeacherEarningsTab() {
  const { ledgerEntries, payoutRecords, bankAccountStatus, loading, error, reload } = useTeacherEarnings();

  if (loading && ledgerEntries.length === 0 && !error) return <RequestsSkeleton rows={3} height={120} />;
  if (error && ledgerEntries.length === 0) return <RequestsError message={error} onRetry={reload} />;

  const { paid, onTheWay } = summariseEarnings(ledgerEntries);

  return (
    <div className="mt-5 flex flex-col gap-6">
      {bankAccountStatus !== "APPROVED" && (
        <Notice
          action={
            <Link
              href="/teacher/earnings?tab=bank"
              className="rounded-[10px] bg-white/70 px-3 py-1.5 text-[13px] font-semibold text-pd-brand-d hover:bg-white"
            >
              {bankAccountStatus === "NONE" ? "Add bank account" : "Review"}
            </Link>
          }
        >
          {BANK_NOTICE[bankAccountStatus]}
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-3">
        <SumCard label="Paid out" value={formatInr(paid)} />
        <SumCard label="On the way" value={formatInr(onTheWay)} />
        <SumCard label="Your share" value={`${Math.round(TEACHER_SHARE * 100)}%`} />
      </div>

      <section aria-labelledby="cycle-payouts">
        <SectionTitle id="cycle-payouts">Cycle payouts</SectionTitle>

        {ledgerEntries.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={Wallet}
              title="No payouts yet"
              text="A row appears here as soon as one of your cycles is complete."
            />
          </div>
        ) : (
          <>
            {/* ≥ 720px: table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-pd-line bg-white min-[720px]:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Student</th>
                    <th className={TH}>Cycle</th>
                    <th className={`${TH} text-right`}>Counted sessions</th>
                    <th className={`${TH} text-right`}>Payout</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((e) => {
                    const status = LEDGER_STATUS[e.payoutStatus];
                    const reason = ledgerReason(e);

                    return (
                      <tr key={e.id} className="group">
                        <td className={TD}>
                          <b className="whitespace-nowrap font-medium text-pd-ink">{e.childName}</b>
                          {e.subject && <small className="block text-xs text-pd-ink3">{e.subject}</small>}
                        </td>
                        <td className={TD}>Cycle {e.cycleNumber}</td>
                        <td className={`${TD} text-right tabular-nums`}>{e.sessionsCompleted}</td>
                        <td className={`${TD} text-right tabular-nums`}>{formatInr(e.monthlyTeacherPay)}</td>
                        <td className={TD}>
                          <Tag tone={status.tone}>{status.label}</Tag>
                          {reason && <small className="mt-1 block max-w-[220px] text-xs text-pd-ink3">{reason}</small>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* < 720px: stacked rows */}
            <div className="overflow-hidden rounded-2xl border border-pd-line bg-white min-[720px]:hidden">
              {ledgerEntries.map((e) => {
                const status = LEDGER_STATUS[e.payoutStatus];
                const reason = ledgerReason(e);

                return (
                  <div key={e.id} className="flex flex-col gap-2 border-t border-pd-line p-4 first:border-t-0">
                    <div className="flex justify-between gap-3 font-semibold text-pd-ink">
                      <span>{e.childName}</span>
                      <span className="tabular-nums">{formatInr(e.monthlyTeacherPay)}</span>
                    </div>
                    <div className="text-[13px] text-pd-ink2">
                      Cycle {e.cycleNumber} · {e.sessionsCompleted} sessions
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={status.tone}>{status.label}</Tag>
                      {reason && <small className="text-xs text-pd-ink3">{reason}</small>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-3 text-[13px] text-pd-ink3">
          A cycle is paid once every class in it is settled.
        </p>
      </section>

      {payoutRecords.length > 0 && (
        <section aria-labelledby="payout-history">
          <SectionTitle id="payout-history">Payout history</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
            {payoutRecords.map((r) => {
              const status = RECORD_STATUS[r.status];

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border-t border-pd-line px-4 py-3.5 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block text-sm font-medium text-pd-ink">{formatPayoutDate(r.createdAt)}</b>
                    <small className="block text-[13px] text-pd-ink3">
                      {r.cycleCount} {r.cycleCount === 1 ? "cycle" : "cycles"}
                      {r.status === "SKIPPED_NO_BANK_ACCOUNT" && r.failureReason ? ` · ${r.failureReason}` : ""}
                    </small>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-pd-ink">{formatInr(r.amount)}</span>
                  <Tag tone={status.tone}>{status.label}</Tag>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
