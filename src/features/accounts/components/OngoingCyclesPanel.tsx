import type { OngoingCycleRow } from "@/features/accounts/server/export.service";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";

interface OngoingCyclesPanelProps {
  rows: OngoingCycleRow[];
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Cycles currently in progress — how many of this month's sessions
 * are done for each active Enrollment, and what that cycle will pay
 * out once it completes. Kept as its own tab, separate from Payout
 * Verification (which only ever shows a cycle *after* it's finished
 * and already has a TuitionLedgerEntry) — the two are different
 * moments in the same lifecycle and were getting confused when
 * shown together.
 */
export default function OngoingCyclesPanel({ rows }: OngoingCyclesPanelProps) {
  const totalProjectedPayout = rows.reduce((s, r) => s + r.projectedTeacherPay, 0);
  const totalProjectedProfit = rows.reduce((s, r) => s + r.projectedProfit, 0);
  const dueSoonCount = rows.filter((r) => r.sessionsCompletedInCycle >= r.sessionsPerMonth - 1).length;

  return (
    <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-violet-100">
        <h2 className="text-lg font-semibold text-gray-800">Ongoing Cycles</h2>
        <p className="text-xs text-gray-400 mt-1">
          Sessions completed so far in each active Enrollment&apos;s current cycle. Payment was
          already collected from the parent upfront — this only tracks progress toward the
          Teacher payout, which appears in Payout Verification once the cycle finishes.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-violet-100 bg-violet-50/40">
        <div>
          <p className="text-xs text-gray-500">Active Cycles</p>
          <p className="text-lg font-bold text-gray-800">{rows.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Almost Due (last session left)</p>
          <p className="text-lg font-bold text-brand">{dueSoonCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Projected Teacher Payout</p>
          <p className="text-lg font-bold text-gray-800">{currency.format(totalProjectedPayout)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Projected Platform Profit</p>
          <p className="text-lg font-bold text-green-700">{currency.format(totalProjectedProfit)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Progress</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Child</th>
              <th className="px-3 py-3">Teacher</th>
              <th className="px-3 py-3">Subject</th>
              <th className="px-3 py-3 text-right">Cycle #</th>
              <th className="px-3 py-3">Cycle Started</th>
              <th className="px-3 py-3">Last Class Marked</th>
              <th className="px-3 py-3 text-right">Monthly Rate</th>
              <th className="px-3 py-3 text-right">Payout When Complete</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No active enrollments with a cycle in progress right now.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.enrollmentId} className="border-t">
                <td className="px-3 py-2">
                  <CycleProgressRing
                    completed={r.sessionsCompletedInCycle}
                    total={r.sessionsPerMonth}
                    size={36}
                    strokeWidth={3}
                  />
                </td>
                <td className="px-3 py-2">{r.parentName}</td>
                <td className="px-3 py-2">{r.childName}</td>
                <td className="px-3 py-2">{r.teacherName}</td>
                <td className="px-3 py-2">{r.subject}</td>
                <td className="px-3 py-2 text-right">{r.cycleNumber}</td>
                <td className="px-3 py-2">{dateFmt.format(r.cycleStartDate)}</td>
                <td className="px-3 py-2 text-gray-400">
                  {r.lastSessionMarkedAt ? dateFmt.format(r.lastSessionMarkedAt) : "—"}
                </td>
                <td className="px-3 py-2 text-right">{currency.format(r.monthlyRate)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {currency.format(r.projectedTeacherPay)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-violet-100 text-xs text-gray-400">
        &quot;Payout When Complete&quot; is a projection at today&apos;s rate — the real payout is
        snapshotted into a Payout Verification row only once the cycle&apos;s last session is
        marked complete.
      </div>
    </div>
  );
}
