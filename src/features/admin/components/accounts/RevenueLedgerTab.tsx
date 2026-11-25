"use client";

import { useMemo, useState } from "react";

import type { LedgerEntry } from "@/features/accounts/hooks/useTuitionLedger";
import { currency, formatDate } from "@/features/accounts/utils/format";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminLoadingState,
  AdminSearchBox,
  AdminStats,
  type AdminColumn,
} from "@/features/admin/components/ui/design";
import { adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";

interface RevenueLedgerTabProps {
  entries: LedgerEntry[];
  loading: boolean;
  error: string;
}

const SUB = "block text-xs text-pd-ink3";

const STATUS: Record<LedgerEntry["payoutStatus"], { label: string; color: AdminTagColor }> = {
  PENDING_VERIFICATION: { label: "Pending verification", color: "gray" },
  EXPIRED: { label: "Verification overdue", color: "amber" },
  ON_HOLD: { label: "On hold", color: "amber" },
  QUEUED_FOR_PAYMENT: { label: "Queued for payment", color: "violet" },
  APPROVED: { label: "Queued for payment", color: "violet" },
  PROCESSING: { label: "Processing", color: "violet" },
  PAID: { label: "Paid", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

interface LedgerRow extends LedgerEntry {
  /** Classes counted in this cycle's month (a cycle is one month). */
  mcc: number;
  /** Classes counted in this and every earlier cycle of the same enrollment. */
  tcc: number;
}

const COLUMNS: Array<AdminColumn<LedgerRow>> = [
  {
    label: "Date",
    block: true,
    nowrap: true,
    render: (r) => (
      <>
        <span className="whitespace-nowrap">{formatDate(r.transactionDate)}</span>
        <small className={SUB}>Due {formatDate(r.dueDate)}</small>
      </>
    ),
  },
  {
    label: "Parent · Student",
    render: (r) => (
      <>
        <b className="font-semibold">{r.parentName}</b>
        <small className={SUB}>
          {[r.childName, r.teacherName, r.subject].filter(Boolean).join(" · ")}
        </small>
      </>
    ),
  },
  {
    label: "Cycle",
    render: (r) => (
      <>
        Cycle {r.cycleNumber}
        <small className={SUB}>
          {r.noOfMonths} month{r.noOfMonths === 1 ? "" : "s"}
        </small>
      </>
    ),
  },
  {
    label: "Rate",
    right: true,
    nowrap: true,
    render: (r) => (
      <>
        {currency.format(r.rate)}
        <small className={SUB}>Teacher {currency.format(r.teacherRate)}</small>
      </>
    ),
  },
  { label: "Monthly rate", right: true, nowrap: true, render: (r) => currency.format(r.monthlyRate) },
  { label: "Total amount", right: true, nowrap: true, render: (r) => currency.format(r.totalAmount) },
  {
    label: "CCC",
    right: true,
    nowrap: true,
    render: (r) => <b className="font-semibold">{r.sessionsCompleted}</b>,
  },
  { label: "MCC", right: true, nowrap: true, render: (r) => r.mcc },
  { label: "TCC", right: true, nowrap: true, render: (r) => r.tcc },
  { label: "Teacher pay", right: true, nowrap: true, render: (r) => currency.format(r.monthlyTeacherPay) },
  { label: "Profits", right: true, nowrap: true, render: (r) => currency.format(r.profits) },
  {
    label: "Status",
    render: (r) => {
      const status = STATUS[r.payoutStatus] ?? { label: r.payoutStatus, color: "gray" as const };

      return <span className={adminTag(status.color)}>{status.label}</span>;
    },
  },
];

/**
 * Accounts "Revenue Ledger" tab (design 16): one row per completed cycle,
 * with the 70/30 split and the class counts. Data is the persisted Tuition
 * Ledger (GET /api/accounts/ledger, shared with Verify Payouts).
 */
export default function RevenueLedgerTab({ entries, loading, error }: RevenueLedgerTabProps) {
  const [query, setQuery] = useState("");

  const rows = useMemo<LedgerRow[]>(() => {
    // TCC = this cycle's count plus every earlier cycle of the same enrollment.
    const ordered = [...entries].sort(
      (a, b) => a.enrollmentId.localeCompare(b.enrollmentId) || a.cycleNumber - b.cycleNumber,
    );
    const running = new Map<string, number>();
    const tccById = new Map<string, number>();

    for (const entry of ordered) {
      const total = (running.get(entry.enrollmentId) ?? 0) + entry.sessionsCompleted;

      running.set(entry.enrollmentId, total);
      tccById.set(entry.id, total);
    }

    return entries.map((entry) => ({
      ...entry,
      mcc: entry.sessionsCompleted,
      tcc: tccById.get(entry.id) ?? entry.sessionsCompleted,
    }));
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((r) =>
      [r.parentName, r.childName, r.teacherName, r.subject].join(" ").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const totals = useMemo(
    () => ({
      billed: entries.reduce((sum, e) => sum + e.totalAmount, 0),
      teacherPay: entries.reduce((sum, e) => sum + e.monthlyTeacherPay, 0),
      profits: entries.reduce((sum, e) => sum + e.profits, 0),
      ccc: entries.reduce((sum, e) => sum + e.sessionsCompleted, 0),
    }),
    [entries],
  );

  return (
    <>
      <AdminStats
        items={[
          { label: "Total billed", value: currency.format(totals.billed) },
          { label: "Teacher pay (70%)", value: currency.format(totals.teacherPay) },
          { label: "Profits (30%)", value: currency.format(totals.profits) },
          { label: "Classes completed (CCC)", value: totals.ccc },
        ]}
      />

      <div className="mb-4 mt-5 rounded-xl bg-pd-b50 px-3.5 py-3">
        <small className="mb-0.5 block text-xs font-semibold text-pd-ink3">
          How to read the class counts
        </small>
        <b className="font-semibold">CCC</b> Current Class Completed (this cycle) ·{" "}
        <b className="font-semibold">MCC</b> Monthly Class Completed ·{" "}
        <b className="font-semibold">TCC</b> Total Class Completed (all cycles). Teacher pay and
        profits are 70% and 30% of the monthly rate, which is the rate × classes that counted.
      </div>

      <AdminSearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search parent, student, teacher or course"
      />

      <div className="mt-4">
        <AdminErrorNote>{error}</AdminErrorNote>
        {loading ? (
          <AdminLoadingState message="Loading the ledger…" />
        ) : visible.length === 0 ? (
          <AdminEmptyState
            title={entries.length === 0 ? "No ledger entries yet" : "No matches"}
            message={
              entries.length === 0
                ? "A row appears here when a cycle closes and every class in it is settled."
                : "No entry matches that search."
            }
          />
        ) : (
          <AdminDataTable wide columns={COLUMNS} rows={visible} rowKey={(r) => r.id} />
        )}
      </div>
    </>
  );
}
