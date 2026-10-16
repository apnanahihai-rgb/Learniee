"use client";

import type { ReactNode } from "react";

import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import type { AccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import { AdminPanel } from "@/features/admin/components/ui/primitives";
import {
  EXPENSE_TINTS,
  PAYOUT_STATUS_COLORS,
  PAYOUT_STATUS_LABELS,
  REVENUE_MAIN,
  EXPENSE_MAIN,
  REVENUE_TINTS,
} from "./constants";

type Analytics = AccountsAnalytics | null;

/** Shared panel chrome for a single donut, so all four look the same. */
export function DonutPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AdminPanel className="overflow-hidden">
      <div className="border-b border-admin-line px-5 py-4">
        <h2 className="font-heading text-[19px] font-bold leading-tight text-admin-ink">{title}</h2>
        <p className="mt-0.5 text-[14px] text-admin-muted">{description}</p>
      </div>
      {children}
    </AdminPanel>
  );
}

/** Revenue vs. Expense: green vs. rose, so the slices never need a key. */
export function RevenueVsExpenseDonut({ analytics }: { analytics: Analytics }) {
  if (!analytics) return null;

  const slices: PieChartSlice[] = [
    { label: "Total revenue", value: analytics.revenue.totalRevenue, color: REVENUE_MAIN },
    { label: "Total expense", value: analytics.expense.totalExpense, color: EXPENSE_MAIN },
  ];

  return (
    <DonutPanel title="Revenue vs. Expense" description="How much of the money moving is coming in vs. going out.">
      <PieChart slices={slices} ariaLabel="Revenue vs expense donut" />
    </DonutPanel>
  );
}

/** Revenue composition: Tuition vs. Demo, tinted from the revenue hue. */
export function RevenueCompositionDonut({ analytics }: { analytics: Analytics }) {
  if (!analytics) return null;

  const slices: PieChartSlice[] = [
    { label: "Tuition", value: analytics.revenue.tuitionRevenue, color: REVENUE_TINTS[0] },
    { label: "Demo", value: analytics.revenue.demoRevenue, color: REVENUE_TINTS[1] },
  ];

  return (
    <DonutPanel title="Revenue Composition" description="What Total Revenue is made of.">
      <PieChart slices={slices} ariaLabel="Revenue composition donut" />
    </DonutPanel>
  );
}

/** Expense composition: Payouts / Referral Rewards / Wallet Credits. */
export function ExpenseCompositionDonut({ analytics }: { analytics: Analytics }) {
  if (!analytics) return null;

  const slices: PieChartSlice[] = [
    { label: "Teacher payouts", value: analytics.expense.teacherPayouts, color: EXPENSE_TINTS[0] },
    { label: "Referral rewards", value: analytics.expense.referralRewards, color: EXPENSE_TINTS[1] },
    { label: "Wallet credits", value: analytics.expense.manualWalletCredits, color: EXPENSE_TINTS[2] },
  ];

  return (
    <DonutPanel title="Expense Composition" description="What Total Expense is made of.">
      <PieChart slices={slices} ariaLabel="Expense composition donut" />
    </DonutPanel>
  );
}

/** Teacher Payout Status: share of payout amount in each workflow status. */
export function PayoutStatusDonut({ analytics }: { analytics: Analytics }) {
  if (!analytics) return null;

  const slices: PieChartSlice[] = analytics.payoutStatusBreakdown.map((r) => ({
    label: `${PAYOUT_STATUS_LABELS[r.status] ?? r.status} (${r.count})`,
    value: r.amount,
    color: PAYOUT_STATUS_COLORS[r.status] ?? "#9ca3af",
  }));

  return (
    <DonutPanel
      title="Teacher Payout Status"
      description="Every Tuition Ledger row for the period, by current payout status."
    >
      <PieChart slices={slices} ariaLabel="Payout status donut" />
    </DonutPanel>
  );
}
