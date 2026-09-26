import "server-only";

import { prisma } from "@/lib/prisma";

import type { AccountsAnalyticsRange } from "./accountsAnalytics.service";

/**
 * Totals for `ManualAccountEntry` — the historical/manual bookkeeping
 * sheet imported outside the app's real Enrollment/cycle/ledger
 * pipeline (see the model's doc-comment in schema.prisma). Kept in its
 * own file and its own response field, deliberately NOT folded into
 * `revenue`/`expense`/`profit`/`net` in `getAccountsAnalytics()`, so the
 * whole feature — this file, the one field on `AccountsAnalytics`, the
 * one call site below, the model, its migration — can be deleted
 * without touching the real numbers.
 *
 * Scoped by `accountMonth` (first-of-month date), not `createdAt` —
 * `range` here means "which accounting months", same spirit as the
 * ledger's `transactionDate` scoping but on a monthly grain.
 */
export interface ManualAccountsSummary {
  totalRevenue: number;
  totalTeacherPay: number;
  totalProfit: number;
  entryCount: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getManualAccountsSummary(
  range?: AccountsAnalyticsRange,
): Promise<ManualAccountsSummary> {
  const where: { accountMonth?: { gte?: Date; lte?: Date } } = {};
  if (range?.from || range?.to) {
    where.accountMonth = {};
    if (range.from) where.accountMonth.gte = range.from;
    if (range.to) where.accountMonth.lte = range.to;
  }

  const agg = await prisma.manualAccountEntry.aggregate({
    where,
    _sum: { totalAmount: true, teacherAmount: true, profit: true },
    _count: { _all: true },
  });

  return {
    totalRevenue: round2(Number(agg._sum.totalAmount ?? 0)),
    totalTeacherPay: round2(Number(agg._sum.teacherAmount ?? 0)),
    totalProfit: round2(Number(agg._sum.profit ?? 0)),
    entryCount: agg._count._all,
  };
}
