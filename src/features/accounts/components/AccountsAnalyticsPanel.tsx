"use client";

import { useMemo, useState, type ReactNode } from "react";

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
  PieChart as PieChartIcon,
  ListChecks,
} from "lucide-react";

import {
  useAccountsAnalytics,
  type AccountsAnalytics,
} from "@/features/accounts/hooks/useAccountsAnalytics";
import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import StatCard from "@/features/accounts/components/StatCard";
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

// One color family per *meaning*, reused everywhere that meaning shows up,
// instead of a different rainbow per chart. Green always means "revenue /
// money in / good"; rose always means "expense / money out"; the two
// composition scales are just lighter tints of the same hue so a
// sub-category still visibly belongs to its parent total.
const REVENUE_MAIN = "#059669"; // emerald-600
const EXPENSE_MAIN = "#e11d48"; // rose-600
const REVENUE_TINTS = ["#059669", "#6ee7b7"]; // Tuition, Demo
const EXPENSE_TINTS = ["#e11d48", "#fb7185", "#fecdd3"]; // Teacher Payouts, Referral Rewards, Wallet Credits

// Payout status is a workflow stage, not a revenue/expense split, so it gets
// its own small palette — but each color still means one fixed thing
// everywhere it appears.
const PAYOUT_STATUS_COLORS: Partial<Record<LedgerPayoutStatus, string>> = {
  PENDING_VERIFICATION: "#64748b", // slate — waiting
  ON_HOLD: "#f59e0b", // amber — needs a decision
  QUEUED_FOR_PAYMENT: "#7e2bf1", // brand violet — on its way
  PAID: "#059669", // emerald — done
  REJECTED: "#e11d48", // rose — money not going out
  EXPIRED: "#9ca3af", // gray — stale
  APPROVED: "#0d9488", // teal — legacy status
};

// Every figure the "Build Your Own Breakdown" donut can show, each with a
// fixed color and how to read it off `AccountsAnalytics`. Ticking any subset
// treats those figures as slices of one combined total — it doesn't assume
// the ticked figures are mutually-exclusive parts of a single whole (Net
// Profit, for instance, is *derived from* Revenue and Expense, not separate
// money), so it's a flexible comparison view, not another "100% of X" chart.
type MetricKey =
  | "totalRevenue"
  | "tuitionRevenue"
  | "demoRevenue"
  | "totalExpense"
  | "teacherPayouts"
  | "referralRewards"
  | "walletCredits"
  | "netProfit"
  | "netLoss"
  | "platformProfit";

const METRIC_DEFS: Record<
  MetricKey,
  { label: string; color: string; getValue: (a: AccountsAnalytics) => number }
> = {
  totalRevenue: { label: "Total Revenue", color: REVENUE_MAIN, getValue: (a) => a.revenue.totalRevenue },
  tuitionRevenue: { label: "Tuition Revenue", color: REVENUE_TINTS[0], getValue: (a) => a.revenue.tuitionRevenue },
  demoRevenue: { label: "Demo Revenue", color: REVENUE_TINTS[1], getValue: (a) => a.revenue.demoRevenue },
  totalExpense: { label: "Total Expense", color: EXPENSE_MAIN, getValue: (a) => a.expense.totalExpense },
  teacherPayouts: { label: "Teacher Payouts", color: EXPENSE_TINTS[0], getValue: (a) => a.expense.teacherPayouts },
  referralRewards: {
    label: "Referral Rewards",
    color: EXPENSE_TINTS[1],
    getValue: (a) => a.expense.referralRewards,
  },
  walletCredits: {
    label: "Wallet Credits",
    color: EXPENSE_TINTS[2],
    getValue: (a) => a.expense.manualWalletCredits,
  },
  netProfit: { label: "Net Profit", color: "#0ea5e9", getValue: (a) => a.net.profit },
  netLoss: { label: "Net Loss", color: "#f97316", getValue: (a) => a.net.loss },
  platformProfit: { label: "Platform Profit", color: "#7e2bf1", getValue: (a) => a.profit.platformProfit },
};

const METRIC_ORDER: MetricKey[] = [
  "totalRevenue",
  "tuitionRevenue",
  "demoRevenue",
  "totalExpense",
  "teacherPayouts",
  "referralRewards",
  "walletCredits",
  "netProfit",
  "netLoss",
  "platformProfit",
];

// A sensible starting selection — roughly what was asked for: Profit, Loss,
// Total Expense, Total Revenue, Teacher Payouts. Net Profit and Net Loss are
// both ticked by default but one of them is always ₹0 (only one applies for
// any given period), so only the one that applies actually shows up.
const DEFAULT_SELECTED_METRICS: MetricKey[] = [
  "totalRevenue",
  "totalExpense",
  "teacherPayouts",
  "netProfit",
  "netLoss",
];

type PresetId = "all" | "this_month" | "last_month" | "this_year" | "custom";

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
 * One independent "Period" selection (preset + optional custom range +
 * derived label). Pulled out so the top-of-page filter and the Build Your
 * Own Breakdown card can each hold their own period without sharing state —
 * switching one to "This Month" must not move the other.
 */
function usePeriodRange() {
  const [preset, setPreset] = useState<PresetId>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((p) => p.id === preset)?.label ?? "";
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Up to ${range.to}`;
    return "All Time";
  }, [preset, range]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel };
}

/** The row of period preset buttons (+ custom date inputs) — rendered by whoever owns a `usePeriodRange()`. */
function PeriodPicker({
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: {
  preset: PresetId;
  onPresetChange: (p: PresetId) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Period</span>
      {PRESETS.map((p) => {
        const active = preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
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
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            aria-label="To date"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-sm text-gray-700"
          />
        </span>
      )}
    </div>
  );
}

/**
 * Accounts Analytics — pie/donut-led layout.
 *
 * Third pass: the previous version mixed bar charts and one donut. Every
 * chart here is now a donut (a pie with a hole for a center total), because
 * every question this page answers is a "what share of the whole" question:
 * revenue vs. expense, what revenue is made of, what expense is made of, and
 * what share of payouts sits in each status. The KPI tiles up top stay as
 * exact numbers for the cases where a shape isn't what you want; the four
 * donuts below are the redesign the diagrams live in. Colors keep the
 * project's fixed-meaning rule: green = revenue, rose = expense, and the
 * payout-status palette is reused identically wherever a status appears.
 *
 * The Build Your Own Breakdown card keeps its own `usePeriodRange()` and
 * fetches independently — it's meant to be checked against a different
 * window than the rest of the page without disturbing it, so it never
 * shares the period state or data below.
 */
export default function AccountsAnalyticsPanel() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel } =
    usePeriodRange();

  const { analytics, loading, error } = useAccountsAnalytics(range);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-4">
        <PeriodPicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
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
          <CustomBreakdownDonut />
          <div className="grid xl:grid-cols-2 gap-6">
            <RevenueVsExpenseDonut analytics={analytics} rangeLabel={rangeLabel} />
            <PayoutStatusDonut analytics={analytics} rangeLabel={rangeLabel} />
            <RevenueCompositionDonut analytics={analytics} rangeLabel={rangeLabel} />
            <ExpenseCompositionDonut analytics={analytics} rangeLabel={rangeLabel} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Top-of-page KPI tiles — the four headline numbers at a glance
 * (Total Revenue, Total Expense, Net Profit/Loss, Platform Profit)
 * instead of having to find them inside a chart below. Colors follow
 * the same rule as the rest of the page: revenue-side numbers are
 * green, expense-side are rose. Platform Profit is the one deliberate
 * exception — it's a *different* profit figure (the resolved 70/30
 * ledger formula, not Revenue − Expense), so it's kept in brand violet
 * specifically so it never gets visually mistaken for Net Profit.
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
          tone="positive"
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
 * Build Your Own Breakdown — tick any of the figures on the page (revenue
 * lines, expense lines, Net Profit / Net Loss, Platform Profit) and see
 * them side by side as shares of one combined total, in one donut. Ticked
 * figures with nothing to show for the selected period (e.g. Net Loss
 * during a profitable month) are simply left out of the ring rather than
 * drawn as a zero-width slice.
 *
 * Holds its own `usePeriodRange()` and its own `useAccountsAnalytics` fetch
 * — deliberately not the page's period/data, so this card can be checked
 * against, say, This Month while the rest of the page stays on All Time.
 */
function CustomBreakdownDonut() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel } =
    usePeriodRange();
  const { analytics, loading, error } = useAccountsAnalytics(range);

  const [selected, setSelected] = useState<Set<MetricKey>>(() => new Set(DEFAULT_SELECTED_METRICS));

  function toggle(key: MetricKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const slices: PieChartSlice[] = analytics
    ? METRIC_ORDER.filter((key) => selected.has(key))
        .map((key) => {
          const def = METRIC_DEFS[key];
          return { label: def.label, value: def.getValue(analytics), color: def.color };
        })
        .filter((s) => s.value > 0)
    : [];

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Build Your Own Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tick any figures below to compare them as shares of one total. Has its own period,
              separate from the filter above.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>

      <div className="px-6 pt-4">
        <PeriodPicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
      </div>

      <div className="p-6 flex flex-col gap-6">
        {loading && <p className="text-sm text-gray-400 text-center py-10">Loading…</p>}

        {!loading && (error || !analytics) && (
          <p className="text-sm text-red-500 text-center py-10">{error || "Unable to load this breakdown."}</p>
        )}

        {!loading && analytics && (
          <>
            <div className="flex flex-wrap gap-2">
              {METRIC_ORDER.map((key) => {
                const def = METRIC_DEFS[key];
                const value = def.getValue(analytics);
                const active = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? "border-transparent text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                    style={active ? { backgroundColor: def.color } : undefined}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? "rgba(255,255,255,0.9)" : def.color }}
                    />
                    {def.label}
                    <span className={active ? "text-white/85" : "text-gray-400"}>
                      {currency.format(value)}
                    </span>
                  </button>
                );
              })}
            </div>

            {slices.length > 0 ? (
              <PieChart
                slices={slices}
                centerLabel={currency.format(total)}
                centerSubLabel={`${slices.length} selected`}
                size={200}
              />
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">
                {selected.size === 0
                  ? "Tick at least one figure above to see the breakdown."
                  : "The figures you've selected are all ₹0 for this period."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Shared card chrome for a single donut, so all four look the same. */
function DonutCard({
  icon: Icon,
  title,
  subtitle,
  rangeLabel,
  children,
  footer,
}: {
  icon: typeof PieChartIcon;
  title: string;
  subtitle: string;
  rangeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b flex items-baseline justify-between flex-wrap gap-2 bg-gray-50">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400">{rangeLabel}</span>
      </div>
      <div className="p-6 flex-1">{children}</div>
      {footer}
    </div>
  );
}

/**
 * Revenue vs. Expense — one donut, two slices, always green vs. rose so
 * "which slice is which" never needs a legend. The center shows Net
 * Profit/Loss, the number this whole page is really building up to.
 */
function RevenueVsExpenseDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const isProfit = analytics.net.profit > 0 || analytics.net.loss === 0;

  const slices: PieChartSlice[] = [
    { label: "Total Revenue", value: analytics.revenue.totalRevenue, color: REVENUE_MAIN },
    { label: "Total Expense", value: analytics.expense.totalExpense, color: EXPENSE_MAIN },
  ];

  return (
    <DonutCard
      icon={PieChartIcon}
      title="Revenue vs. Expense"
      subtitle="How much of the money moving is coming in vs. going out."
      rangeLabel={rangeLabel}
      footer={
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
      }
    >
      <PieChart
        slices={slices}
        centerLabel={isProfit ? currency.format(analytics.net.profit) : `(${currency.format(analytics.net.loss)})`}
        centerSubLabel={isProfit ? "Net Profit" : "Net Loss"}
        size={180}
      />
    </DonutCard>
  );
}

/** Revenue composition — Tuition vs. Demo, tinted from the revenue hue. */
function RevenueCompositionDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const slices: PieChartSlice[] = [
    { label: "Tuition", value: analytics.revenue.tuitionRevenue, color: REVENUE_TINTS[0] },
    { label: "Demo", value: analytics.revenue.demoRevenue, color: REVENUE_TINTS[1] },
  ];

  return (
    <DonutCard
      icon={TrendingUp}
      title="Revenue Composition"
      subtitle="What Total Revenue is made of."
      rangeLabel={rangeLabel}
    >
      <PieChart
        slices={slices}
        centerLabel={currency.format(analytics.revenue.totalRevenue)}
        centerSubLabel="Total Revenue"
        size={180}
      />
    </DonutCard>
  );
}

/** Expense composition — Payouts / Referral Rewards / Wallet Credits, tinted from the expense hue. */
function ExpenseCompositionDonut({
  analytics,
  rangeLabel,
}: {
  analytics: ReturnType<typeof useAccountsAnalytics>["analytics"];
  rangeLabel: string;
}) {
  if (!analytics) return null;
  const slices: PieChartSlice[] = [
    { label: "Teacher Payouts", value: analytics.expense.teacherPayouts, color: EXPENSE_TINTS[0] },
    { label: "Referral Rewards", value: analytics.expense.referralRewards, color: EXPENSE_TINTS[1] },
    { label: "Wallet Credits", value: analytics.expense.manualWalletCredits, color: EXPENSE_TINTS[2] },
  ];

  return (
    <DonutCard
      icon={TrendingDown}
      title="Expense Composition"
      subtitle="What Total Expense is made of."
      rangeLabel={rangeLabel}
    >
      <PieChart
        slices={slices}
        centerLabel={currency.format(analytics.expense.totalExpense)}
        centerSubLabel="Total Expense"
        size={180}
      />
    </DonutCard>
  );
}

/**
 * Teacher Payout Status — one donut: what share of total payout amount
 * sits in each workflow status. Reads from the same `PAYOUT_STATUS_COLORS`
 * map used elsewhere, so a color always means the same status.
 */
function PayoutStatusDonut({
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

  const slices: PieChartSlice[] = rows.map((r) => ({
    label: `${PAYOUT_STATUS_LABELS[r.status] ?? r.status} (${r.count})`,
    value: r.amount,
    color: PAYOUT_STATUS_COLORS[r.status] ?? "#9ca3af",
  }));

  return (
    <DonutCard
      icon={ReceiptText}
      title="Teacher Payout Status"
      subtitle="Every Tuition Ledger row for the period, by current payout status."
      rangeLabel={rangeLabel}
      footer={
        rows.length > 0 ? (
          <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="font-semibold text-gray-800 tabular-nums">
              {currency.format(totalAmount)}{" "}
              <span className="text-gray-400 font-normal">({totalCount} rows)</span>
            </span>
          </div>
        ) : undefined
      }
    >
      <PieChart slices={slices} centerLabel={currency.format(totalAmount)} centerSubLabel="Total" size={180} />
    </DonutCard>
  );
}
