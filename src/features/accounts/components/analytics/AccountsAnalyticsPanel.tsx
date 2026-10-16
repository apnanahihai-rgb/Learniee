"use client";

import { useAccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import { AccountsKpiStrip } from "@/features/accounts/components/ui/accountsUi";
import { AdminEmpty, AdminError, AdminLoading } from "@/features/admin/components/ui/primitives";
import { currency } from "@/features/accounts/utils/format";
import { CustomBreakdownDonut } from "./breakdown";
import {
  ExpenseCompositionDonut,
  PayoutStatusDonut,
  RevenueCompositionDonut,
  RevenueVsExpenseDonut,
} from "./donuts";
import { PeriodPicker, usePeriodRange } from "./period";

/**
 * Accounts Analytics: a period picker, four headline numbers, then donuts for
 * every "what share of the whole" question (revenue vs. expense, what each is
 * made of, payouts by status) and the Build Your Own Breakdown panel.
 *
 * Colour rule (unchanged): green = revenue, rose = expense, violet = Platform
 * Profit, which is a different figure (the resolved 70/30 ledger formula, not
 * Revenue - Expense) and so is never coloured like Net Profit.
 */
export default function AccountsAnalyticsPanel() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel } =
    usePeriodRange();
  const { analytics, loading, error } = useAccountsAnalytics(range);

  const isProfit = analytics ? analytics.net.profit > 0 || analytics.net.loss === 0 : true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
        <span className="text-[15px] text-admin-muted">Showing: {rangeLabel}</span>
      </div>

      {loading ? (
        <AdminLoading message="Loading analytics…" />
      ) : !analytics ? (
        <>
          <AdminError>{error}</AdminError>
          <AdminEmpty message="Unable to load analytics." />
        </>
      ) : (
        <>
          <AccountsKpiStrip
            items={[
              {
                label: "Total revenue",
                value: currency.format(analytics.revenue.totalRevenue),
                tone: "good",
                note: "Tuition + Demo",
              },
              {
                label: "Total expense",
                value: currency.format(analytics.expense.totalExpense),
                tone: "bad",
                note: "Payouts + Rewards + Wallet",
              },
              {
                label: isProfit ? "Net profit" : "Net loss",
                value: isProfit
                  ? currency.format(analytics.net.profit)
                  : `(${currency.format(analytics.net.loss)})`,
                tone: isProfit ? "good" : "bad",
                note: "Revenue − Expense",
              },
              {
                label: "Platform profit",
                value: currency.format(analytics.profit.platformProfit),
                tone: "brand",
                note: "Resolved 70/30 ledger formula",
              },
            ]}
          />

          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
            <RevenueVsExpenseDonut analytics={analytics} />
            <RevenueCompositionDonut analytics={analytics} />
            <ExpenseCompositionDonut analytics={analytics} />
            <PayoutStatusDonut analytics={analytics} />
          </div>

          <CustomBreakdownDonut />
        </>
      )}
    </div>
  );
}
