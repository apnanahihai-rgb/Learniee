"use client";

import { useState } from "react";

import type { OngoingCycleRow } from "@/features/accounts/server/export.service";
import { usePagination } from "@/features/accounts/hooks/usePagination";
import { AdminPanel } from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
  AccountsKpiStrip,
  AccountsPagination,
  AccountsTable,
  ExportLink,
  FilterSpacer,
  ProgressBar,
  ProgressRing,
  TableMessageRow,
  TwoLine,
  filterControlClass,
  numClass,
  rowClass,
  tdClass,
  tfootCellClass,
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currency, formatDate } from "@/features/accounts/utils/format";
import { matchesQuery } from "@/features/accounts/utils/period";

/** A cycle is "almost due" once only its last session is left. */
function isAlmostDue(row: OngoingCycleRow) {
  return row.sessionsCompletedInCycle >= row.sessionsPerMonth - 1;
}

interface OngoingCyclesTableProps {
  rows: OngoingCycleRow[];
  /** "compact" is the Overview version (progress bar, payout only). */
  variant?: "full" | "compact";
  /** Change this whenever the caller's filters change so paging resets. */
  resetKey?: string;
  emptyMessage?: string;
}

/**
 * Cycles currently in progress: how many of this month's sessions are done for
 * each active Enrollment, and what that cycle will pay out once it completes.
 * Payment was already collected upfront, so this only tracks progress toward
 * the Teacher payout (which shows up in Verify Payouts once the cycle finishes).
 */
export function OngoingCyclesTable({
  rows,
  variant = "full",
  resetKey = "",
  emptyMessage = "No active enrollments with a cycle in progress right now.",
}: OngoingCyclesTableProps) {
  const compact = variant === "compact";
  const paging = usePagination(rows, resetKey);
  const colCount = compact ? 8 : 9;

  const pagePayout = paging.pageItems.reduce((sum, r) => sum + r.projectedTeacherPay, 0);
  const pageProfit = paging.pageItems.reduce((sum, r) => sum + r.projectedProfit, 0);

  return (
    <>
      <AccountsTable minWidth={compact ? 900 : 1000}>
        <thead>
          <tr>
            <th className={thClass}>Progress</th>
            <th className={thClass}>Parent / Child</th>
            <th className={thClass}>Teacher / Subject</th>
            <th className={`${thClass} text-right`}>Cycle</th>
            <th className={thClass}>Started</th>
            <th className={thClass}>Last class{compact ? "" : " marked"}</th>
            <th className={`${thClass} text-right`}>Monthly rate</th>
            <th className={`${thClass} text-right`}>{compact ? "Payout" : "Teacher payout"}</th>
            {!compact && <th className={`${thClass} text-right`}>Platform profit</th>}
          </tr>
        </thead>
        <tbody>
          {paging.pageItems.length === 0 && <TableMessageRow colSpan={colCount}>{emptyMessage}</TableMessageRow>}
          {paging.pageItems.map((r) => (
            <tr key={r.enrollmentId} className={rowClass}>
              <td className={tdClass}>
                {compact ? (
                  <ProgressBar done={r.sessionsCompletedInCycle} total={r.sessionsPerMonth} />
                ) : (
                  <ProgressRing done={r.sessionsCompletedInCycle} total={r.sessionsPerMonth} />
                )}
              </td>
              <td className={tdClass}>
                <TwoLine primary={r.parentName} secondary={r.childName} />
              </td>
              <td className={tdClass}>
                <TwoLine primary={r.teacherName} secondary={r.subject} />
              </td>
              <td className={`${tdClass} ${numClass}`}>{r.cycleNumber}</td>
              <td className={tdClass}>{formatDate(r.cycleStartDate)}</td>
              <td className={`${tdClass} text-admin-muted`}>{formatDate(r.lastSessionMarkedAt)}</td>
              <td className={`${tdClass} ${numClass}`}>{currency.format(r.monthlyRate)}</td>
              <td className={`${tdClass} ${numClass} font-extrabold`}>{currency.format(r.projectedTeacherPay)}</td>
              {!compact && (
                <td className={`${tdClass} ${numClass} font-extrabold text-brand-dark`}>
                  {currency.format(r.projectedProfit)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {!compact && paging.pageItems.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={7} className={tfootCellClass}>
                Page total
              </td>
              <td className={`${tfootCellClass} ${numClass}`}>{currency.format(pagePayout)}</td>
              <td className={`${tfootCellClass} ${numClass}`}>{currency.format(pageProfit)}</td>
            </tr>
          </tfoot>
        )}
      </AccountsTable>
      <AccountsPagination
        from={paging.from}
        to={paging.to}
        total={paging.total}
        page={paging.page}
        pageCount={paging.pageCount}
        onPage={paging.setPage}
        noun="active cycles"
      />
    </>
  );
}

interface OngoingCyclesPanelProps {
  rows: OngoingCycleRow[];
}

/** Full "Ongoing Cycles" screen body: KPI strip + filters + table. */
export default function OngoingCyclesPanel({ rows }: OngoingCyclesPanelProps) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "almost-due">("all");

  const totalProjectedPayout = rows.reduce((s, r) => s + r.projectedTeacherPay, 0);
  const totalProjectedProfit = rows.reduce((s, r) => s + r.projectedProfit, 0);
  const almostDueCount = rows.filter(isAlmostDue).length;

  const filtered = rows.filter(
    (r) =>
      (show === "all" || isAlmostDue(r)) &&
      matchesQuery(query, r.parentName, r.childName, r.teacherName, r.subject),
  );

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          { label: "Active cycles", value: rows.length },
          {
            label: "Almost due (last session left)",
            value: almostDueCount,
            tone: almostDueCount > 0 ? "warn" : "default",
          },
          { label: "Projected teacher payout", value: currency.format(totalProjectedPayout) },
          { label: "Projected platform profit", value: currency.format(totalProjectedProfit), tone: "brand" },
        ]}
      />

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="cycles-search">
            <input
              id="cycles-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Parent, child or teacher"
              className={filterControlClass}
            />
          </AccountsFilterField>
          <AccountsFilterField label="Show" htmlFor="cycles-show">
            <select
              id="cycles-show"
              value={show}
              onChange={(e) => setShow(e.target.value as "all" | "almost-due")}
              className={filterControlClass}
            >
              <option value="all">All active cycles</option>
              <option value="almost-due">Almost due only</option>
            </select>
          </AccountsFilterField>
          <FilterSpacer />
          <ExportLink href={EXPORT_HREF} />
        </AccountsFilterBar>

        <OngoingCyclesTable
          rows={filtered}
          resetKey={`${query}|${show}`}
          emptyMessage={
            rows.length === 0
              ? "No active enrollments with a cycle in progress right now."
              : "No cycles match these filters."
          }
        />
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        Payout is a projection at today&apos;s rate. The real payout is snapshotted into a Verify Payouts row only
        once the cycle&apos;s last session is settled.
      </p>
    </div>
  );
}
