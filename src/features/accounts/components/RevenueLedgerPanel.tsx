"use client";

import { useMemo, useState } from "react";

import type { TuitionLedgerRow } from "@/features/accounts/server/export.service";
import { usePagination } from "@/features/accounts/hooks/usePagination";
import { AdminPanel, type PillTone } from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
  AccountsKpiStrip,
  AccountsPagination,
  AccountsTable,
  ExportLink,
  FilterSpacer,
  StatusPill,
  TableMessageRow,
  TwoLine,
  filterControlClass,
  numClass,
  rowClass,
  tdClass,
  tfootCellClass,
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currency, formatDate, humanizeEnum } from "@/features/accounts/utils/format";
import {
  TABLE_PERIOD_OPTIONS,
  matchesPeriod,
  matchesQuery,
  type TablePeriod,
} from "@/features/accounts/utils/period";

interface RevenueLedgerPanelProps {
  rows: TuitionLedgerRow[];
}

const DUE_SOON = "__DUE_SOON__";

function statusTone(status: string): PillTone {
  if (status === "ACTIVE" || status === "COMPLETED") return "good";
  if (status === "REJECTED" || status === "CANCELLED") return "bad";
  if (status === "LAPSED") return "neutral";

  return "warn";
}

/**
 * Enrollment-level revenue ledger: one row per Enrollment (not per completed
 * payout cycle; Verify Payouts covers that). The columns on screen are the ones
 * Accounts reads day to day; the Excel export still carries all 17 fields
 * (monthly rate, teacher rate, teacher pay, profits...).
 */
export default function RevenueLedgerPanel({ rows }: RevenueLedgerPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState<TablePeriod>("all");

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status === DUE_SOON ? !r.isDueSoon : status && r.status !== status) return false;

        return (
          matchesQuery(query, r.parentName, r.childName, r.teacherName, r.subject) &&
          matchesPeriod(r.transactionDate, period)
        );
      }),
    [rows, query, status, period],
  );

  const paging = usePagination(filtered, `${query}|${status}|${period}`);

  const totalRevenue = rows.reduce((s, r) => s + r.totalAmount, 0);
  const dueSoonCount = rows.filter((r) => r.isDueSoon).length;

  const pageTotal = paging.pageItems.reduce((s, r) => s + r.totalAmount, 0);
  const pageCcc = paging.pageItems.reduce((s, r) => s + r.ccc, 0);
  const pageMcc = paging.pageItems.reduce((s, r) => s + r.mcc, 0);
  const pageTcc = paging.pageItems.reduce((s, r) => s + r.tcc, 0);

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          { label: "Total revenue", value: currency.format(totalRevenue) },
          { label: "Entries", value: rows.length },
          { label: "Due within 5 days", value: dueSoonCount, tone: dueSoonCount > 0 ? "warn" : "default" },
        ]}
      />

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="revenue-search">
            <input
              id="revenue-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Parent, child or teacher"
              className={filterControlClass}
            />
          </AccountsFilterField>
          <AccountsFilterField label="Status" htmlFor="revenue-status">
            <select
              id="revenue-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={filterControlClass}
            >
              <option value="">All statuses</option>
              <option value={DUE_SOON}>Due within 5 days</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {humanizeEnum(s)}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <AccountsFilterField label="Period" htmlFor="revenue-period">
            <select
              id="revenue-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as TablePeriod)}
              className={filterControlClass}
            >
              {TABLE_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <FilterSpacer />
          <ExportLink href={EXPORT_HREF} />
        </AccountsFilterBar>

        <AccountsTable minWidth={1000}>
          <thead>
            <tr>
              <th className={thClass}>Date</th>
              <th className={thClass}>Parent / Child</th>
              <th className={thClass}>Teacher / Subject</th>
              <th className={`${thClass} text-right`}>Months × rate</th>
              <th className={`${thClass} text-right`}>Total</th>
              <th className={`${thClass} text-right`}>CCC</th>
              <th className={`${thClass} text-right`}>MCC</th>
              <th className={`${thClass} text-right`}>TCC</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageItems.length === 0 && (
              <TableMessageRow colSpan={9}>
                {rows.length === 0 ? "No enrollments yet." : "No entries match these filters."}
              </TableMessageRow>
            )}
            {paging.pageItems.map((r) => (
              <tr key={r.enrollmentId} className={`${rowClass} ${r.isDueSoon ? "bg-[#fff8e6]" : ""}`}>
                <td className={tdClass}>
                  <TwoLine
                    primary={formatDate(r.transactionDate)}
                    secondary={
                      <>
                        Due {formatDate(r.dueDate)}
                        {r.isDueSoon && <span className="ml-1 font-extrabold text-[#6b4a00]">· due soon</span>}
                      </>
                    }
                  />
                </td>
                <td className={tdClass}>
                  <TwoLine primary={r.parentName} secondary={r.childName} />
                </td>
                <td className={tdClass}>
                  <TwoLine primary={r.teacherName} secondary={r.subject} />
                </td>
                <td className={`${tdClass} ${numClass}`}>
                  {r.noOfMonths} × {currency.format(r.rate)}
                </td>
                <td className={`${tdClass} ${numClass} font-extrabold`}>{currency.format(r.totalAmount)}</td>
                <td className={`${tdClass} ${numClass}`}>{r.ccc || "—"}</td>
                <td className={`${tdClass} ${numClass}`}>{r.mcc || "—"}</td>
                <td className={`${tdClass} ${numClass}`}>{r.tcc || "—"}</td>
                <td className={tdClass}>
                  <StatusPill tone={statusTone(r.status)}>{humanizeEnum(r.status)}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
          {paging.pageItems.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className={tfootCellClass}>
                  Page total
                </td>
                <td className={`${tfootCellClass} ${numClass}`}>{currency.format(pageTotal)}</td>
                <td className={`${tfootCellClass} ${numClass}`}>{pageCcc}</td>
                <td className={`${tfootCellClass} ${numClass}`}>{pageMcc}</td>
                <td className={`${tfootCellClass} ${numClass}`}>{pageTcc}</td>
                <td className={tfootCellClass} />
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
          noun="entries"
        />
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        CCC, MCC and TCC show a dash where session data isn&apos;t available for that enrollment. Rows highlighted
        yellow are due within 5 days. The Excel export has every column, including rates, teacher pay and profits.
      </p>
    </div>
  );
}
