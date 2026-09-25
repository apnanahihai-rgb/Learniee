"use client";

import { useMemo, useState } from "react";

import type { LedgerPayoutStatus } from "@prisma/client";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Wallet2,
  PiggyBank,
  ReceiptText,
  BarChart3,
} from "lucide-react";

import { useAccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import StatCard from "@/features/accounts/components/StatCard";
import BarChart, { StackedBar } from "@/features/accounts/components/BarChart";
import {
  daysInMonth,
  toDateKey,
  todayInPlatformTz,
  type CalendarDate,
} from "@/lib/platformTime";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Brand violet/yellow first, then a small extended palette for the
// remaining slices — see globals.css for --brand-violet/--brand-yellow.
const PALETTE = ["#7e2bf1", "#f4c01e", "#0ea5a4", "#ef4444", "#3b82f6", "#22c55e", "#f97316"];

const PAYOUT_STATUS_COLORS: Partial<Record<LedgerPayoutStatus, string>> = {
  PENDING_VERIFICATION: "#3b82f6",
  ON_HOLD: "#f4c01e",
  QUEUED_FOR_PAYMENT: "#7e2bf1",
  PAID: "#22c55e",
  REJECTED: "#ef4444",
  EXPIRED: "#9ca3af",
  APPROVED: "#0ea5a4",
};

type MetricId = "pl" | "expense" | "revenue" | "payout_status";
type PresetId = "all" | "this_month" | "last_month" | "this_year" | "custom";

const METRICS: { id: MetricId; label: string }[] = [
  { id: "pl", label: "Profit & Loss" },
  { id: "expense", label: "Expense Distribution" },
  { id: "revenue", label: "Revenue Breakdown" },
  { id: "payout_status", label: "Teacher Payout Status" },
];

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const PAYOUT_STATUS_LABELS: Record<LedgerPayoutStatus, string> = {
  PENDING_VERIFICATION: "Pending Verification",
  ON_HOLD: "On Hold",
  QUEUED_FOR_PAYMENT: "Queued for Payment",
  PAID: "Paid",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  APPROVED: "Approved (legacy)",
};

function presetRange(preset: PresetId): { from?: string; to?: string } {
  const today = todayInPlatformTz();

  if (preset === "all") return {};

  if (preset === "this_month") {
    const from: CalendarDate = { year: today.year, month: today.month, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  if (preset === "last_month") {
    const year = today.month === 1 ? today.year - 1 : today.year;
    const month = today.month === 1 ? 12 : today.month - 1;
    const from: CalendarDate = { year, month, day: 1 };
    const to: CalendarDate = { year, month, day: daysInMonth(year, month) };
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  if (preset === "this_year") {
    const from: CalendarDate = { year: today.year, month: 1, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  // "custom" is resolved by the caller from the date inputs, not here.
  return {};
}

/**
 * Accounts Analytics — visual dashboard layout.
 *
 * Redesigned so the period's numbers are read off charts and bars
 * instead of ledger-style text tables: a KPI row up top, an
 * Income-vs-Expense comparison bar chart with composition bars for
 * each side, and a horizontal bar chart for Teacher Payout Status
 * (replacing the old data table). The original selectable donut chart
 * is kept for the four metrics (Profit & Loss / Expense Distribution /
 * Revenue Breakdown / Teacher Payout Status).
 *
 * The underlying data and the "Period" picker (All Time / This Month /
 * Last Month / This Year / a custom date range) are unchanged — see
 * `accountsAnalytics.service.ts` for exactly what counts as "realized"
 * and how the Net Profit/Loss view differs from the resolved ledger
 * Profits formula.
 */
export default function AccountsAnalyticsPanel() {
  const [metric, setMetric] = useState<MetricId>("pl");
  const [preset, setPreset] = useState<PresetId>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const { analytics, loading, error } = useAccountsAnalytics(range);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((p) => p.id === preset)?.label ?? "";
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Up to ${range.to}`;
    return "All Time";
  }, [preset, range]);

  const slices: PieChartSlice[] = useMemo(() => {
    if (!analytics) return [];

    if (metric === "pl") {
      return [
        { label: "Net Profit", value: analytics.net.profit, color: PALETTE[0] },
        { label: "Net Loss", value: analytics.net.loss, color: PALETTE[3] },
        { label: "Expense (Payouts + Rewards)", value: analytics.expense.totalExpense, color: PALETTE[1] },
      ];
    }

    if (metric === "expense") {
      return [
        { label: "Teacher Payouts", value: analytics.expense.teacherPayouts, color: PALETTE[0] },
        { label: "Referral Rewards", value: analytics.expense.referralRewards, color: PALETTE[1] },
        { label: "Wallet Credits (Refunds)", value: analytics.expense.manualWalletCredits, color: PALETTE[2] },
      ];
    }

    if (metric === "revenue") {
      return [
        { label: "Tuition Revenue", value: analytics.revenue.tuitionRevenue, color: PALETTE[0] },
        { label: "Demo Revenue", value: analytics.revenue.demoRevenue, color: PALETTE[1] },
      ];
    }

    // payout_status
    return analytics.payoutStatusBreakdown.map((row, i) => ({
      label: `${PAYOUT_STATUS_LABELS[row.status] ?? row.status} (${row.count})`,
      value: row.amount,
      color: PAYOUT_STATUS_COLORS[row.status] ?? PALETTE[i % PALETTE.length],
    }));
  }, [analytics, metric]);

  const centerTotal = useMemo(() => slices.reduce((sum, s) => sum + Math.max(0, s.value), 0), [slices]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">
            Period
          </span>
          {PRESETS.map((p) => {
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
                aria-pressed={active}
              >
                {p.label}
              </button>
            );
          })}

          {preset === "custom" && (
            <span className="flex items-center gap-2 ml-1">
              <input
                aria-label="From date"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                aria-label="To date"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
              />
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-400">
          Loading analytics…
        </div>
      )}

      {!loading && (error || !analytics) && (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-red-500">
          {error || "Unable to load analytics."}
        </div>
      )}

      {!loading && analytics && (
        <>
          <KpiRow analytics={analytics} rangeLabel={rangeLabel} />

          <IncomeVsExpenseChart analytics={analytics} rangeLabel={rangeLabel} />

          <div className="grid xl:grid-cols-5 gap-6 items-start">
            <div className="xl:col-span-3">
              <PayoutStatusChart analytics={analytics} rangeLabel={rangeLabel} />
            </div>

            <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm p-6">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {METRICS.map((m) => {
                  const active = metric === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetric(m.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-gray-800 border-gray-800 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      aria-pressed={active}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="mb-1 mt-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  {METRICS.find((m) => m.id === metric)?.label}
                </h2>
                <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                {metric === "pl" &&
                  "Total revenue (Tuition + Demo) vs. total expense (Teacher Payouts, Referral Rewards, Wallet credits) for the selected period. Net Loss is 0 unless expense exceeds revenue."}
                {metric === "expense" &&
                  "Realized (queued-for-payment or paid) Teacher Payouts, Referral Rewards, and manual Wallet credits. Wallet top-ups are excluded — that's a parent's own money, not a platform expense."}
                {metric === "revenue" && "Tuition + Demo revenue for the selected period."}
                {metric === "payout_status" &&
                  "Every Tuition Ledger row for the selected period, bucketed by its current payout status."}
              </p>
              <PieChart
                slices={slices}
                centerLabel={currency.format(centerTotal)}
                centerSubLabel="Total"
                size={160}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Top-of-page KPI tiles — the four headline numbers at a glance
 * (Total Revenue, Total Expense, Net Profit/Loss, Platform Profit)
 * instead of having to find them inside a ledger table below.
 */
function KpiRow({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500">Overview</h2>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={currency.format(analytics.revenue.totalRevenue)}
          icon={IndianRupee}
          tone="brand"
          sublabel="Tuition + Demo"
        />
        <StatCard
          label="Total Expense"
          value={currency.format(analytics.expense.totalExpense)}
          icon={Wallet2}
          tone="negative"
          sublabel="Payouts + Rewards + Wallet"
        />
        <StatCard
          label={isProfit ? "Net Profit" : "Net Loss"}
          value={isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
          icon={isProfit ? TrendingUp : TrendingDown}
          tone={isProfit ? "positive" : "negative"}
          sublabel="Revenue − Expense"
        />
        <StatCard
          label="Platform Profit"
          value={currency.format(analytics.profit.platformProfit)}
          icon={PiggyBank}
          tone="brand"
          sublabel="Resolved 70/30 ledger formula"
        />
      </div>
    </div>
  );
}

/**
 * Income vs. Expense — a two-bar comparison chart (sharing one scale)
 * plus a composition bar under each side, replacing the old text-only
 * "Statement of Accounts" ledger rows. The bold Net Profit/Loss banner
 * from before is kept since it's already a visual callout.
 */
function IncomeVsExpenseChart({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;
  const scale = Math.max(1, analytics.revenue.totalRevenue, analytics.expense.totalExpense);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Income vs. Expense</h2>
            <p className="text-xs text-gray-400 mt-0.5">Visual comparison for the period.</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>

      <div className="p-6">
        <BarChart
          maxValue={scale}
          valueFormatter={(n) => currency.format(n)}
          data={[
            { label: "Total Revenue", value: analytics.revenue.totalRevenue, color: "#10b981" },
            { label: "Total Expense", value: analytics.expense.totalExpense, color: "#f43f5e" },
          ]}
        />
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t">
        <div className="p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-3">
            <TrendingUp size={14} /> Revenue composition
          </p>
          <StackedBar
            valueFormatter={(n) => currency.format(n)}
            segments={[
              { label: "Tuition", value: analytics.revenue.tuitionRevenue, color: PALETTE[0] },
              { label: "Demo", value: analytics.revenue.demoRevenue, color: PALETTE[1] },
            ]}
          />
        </div>
        <div className="p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-600 mb-3">
            <TrendingDown size={14} /> Expense composition
          </p>
          <StackedBar
            valueFormatter={(n) => currency.format(n)}
            segments={[
              { label: "Teacher Payouts", value: analytics.expense.teacherPayouts, color: PALETTE[0] },
              { label: "Referral Rewards", value: analytics.expense.referralRewards, color: PALETTE[1] },
              { label: "Wallet Credits", value: analytics.expense.manualWalletCredits, color: PALETTE[2] },
            ]}
          />
        </div>
      </div>

      <div className="px-6 pb-6 pt-4 border-t">
        <div
          className={`rounded-lg border px-4 py-4 flex flex-wrap items-center justify-between gap-3 ${
            isProfit ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-lg ${
                isProfit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {isProfit ? "Net Profit" : "Net Loss"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Total Revenue − Total Expenses, this period.</p>
            </div>
          </div>
          <span
            className={`text-xl font-bold tabular-nums ${isProfit ? "text-emerald-700" : "text-rose-700"}`}
          >
            {isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Teacher Payout Status — a horizontal bar per status (replacing the
 * old ruled data table), scaled to the largest bucket, with the row
 * count shown next to each amount.
 */
function PayoutStatusChart({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const rows = analytics.payoutStatusBreakdown;
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Teacher Payout Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Every Tuition Ledger row for the period, by current payout status.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>

      <div className="p-6">
        <BarChart
          data={rows.map((r) => ({
            label: PAYOUT_STATUS_LABELS[r.status] ?? r.status,
            value: r.amount,
            color: PAYOUT_STATUS_COLORS[r.status] ?? "#9ca3af",
            sublabel: `(${r.count})`,
          }))}
          valueFormatter={(n) => compactCurrency.format(n)}
        />
      </div>

      {rows.length > 0 && (
        <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">Total</span>
          <span className="font-semibold text-gray-800 tabular-nums">
            {currency.format(totalAmount)} <span className="text-gray-400 font-normal">({totalCount} rows)</span>
          </span>
        </div>
      )}
    </div>
  );
}
