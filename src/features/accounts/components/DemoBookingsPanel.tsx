"use client";

import { useMemo, useState } from "react";

import type { DemoBookingRow } from "@/features/accounts/server/export.service";
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

interface DemoBookingsPanelProps {
  rows: DemoBookingRow[];
}

function statusTone(status: string): PillTone {
  if (status === "CONFIRMED" || status === "COMPLETED") return "good";
  if (status === "CANCELLED") return "bad";

  return "warn";
}

/**
 * Paid demo bookings (the 3rd demo onward; each parent gets 2 free), outside
 * the tuition cycle. Only paid bookings with a Razorpay payment id are loaded.
 */
export default function DemoBookingsPanel({ rows }: DemoBookingsPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState<TablePeriod>("all");

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!status || r.status === status) &&
          matchesQuery(query, r.parentName, r.childName, r.teacherName, r.subject, r.razorpayPaymentId) &&
          matchesPeriod(r.date, period),
      ),
    [rows, query, status, period],
  );

  const paging = usePagination(filtered, `${query}|${status}|${period}`);

  const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);
  const pageTotal = paging.pageItems.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          { label: "Demo revenue", value: currency.format(totalRevenue) },
          { label: "Bookings", value: rows.length },
        ]}
      />

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="demo-search">
            <input
              id="demo-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Parent, child or payment ID"
              className={filterControlClass}
            />
          </AccountsFilterField>
          <AccountsFilterField label="Status" htmlFor="demo-status">
            <select
              id="demo-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={filterControlClass}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {humanizeEnum(s)}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <AccountsFilterField label="Period" htmlFor="demo-period">
            <select
              id="demo-period"
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

        <AccountsTable minWidth={900}>
          <thead>
            <tr>
              <th className={thClass}>Date</th>
              <th className={thClass}>Parent / Child</th>
              <th className={thClass}>Teacher / Subject</th>
              <th className={`${thClass} text-right`}>Amount</th>
              <th className={thClass}>Razorpay payment ID</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageItems.length === 0 && (
              <TableMessageRow colSpan={6}>
                {rows.length === 0 ? "No paid demo bookings yet." : "No bookings match these filters."}
              </TableMessageRow>
            )}
            {paging.pageItems.map((d, i) => (
              <tr key={d.razorpayPaymentId || `${d.date.toString()}-${i}`} className={rowClass}>
                <td className={tdClass}>{formatDate(d.date)}</td>
                <td className={tdClass}>
                  <TwoLine primary={d.parentName} secondary={d.childName} />
                </td>
                <td className={tdClass}>
                  <TwoLine primary={d.teacherName} secondary={d.subject} />
                </td>
                <td className={`${tdClass} ${numClass} font-extrabold`}>{currency.format(d.amount)}</td>
                <td className={`${tdClass} font-mono text-[13px] text-admin-muted`}>{d.razorpayPaymentId || "—"}</td>
                <td className={tdClass}>
                  <StatusPill tone={statusTone(d.status)}>{humanizeEnum(d.status)}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
          {paging.pageItems.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className={tfootCellClass}>
                  Page total
                </td>
                <td className={`${tfootCellClass} ${numClass}`}>{currency.format(pageTotal)}</td>
                <td colSpan={2} className={tfootCellClass} />
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
          noun="bookings"
        />
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        Paid demo sessions: 2 free per parent, then ₹100, plus the international surcharge where it applies.
      </p>
    </div>
  );
}
