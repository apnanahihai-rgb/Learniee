"use client";

import { useMemo, useState } from "react";

import { useInvoices, type InvoiceType } from "@/features/accounts/hooks/useInvoices";
import { usePagination } from "@/features/accounts/hooks/usePagination";
import { AdminError, AdminPanel } from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
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
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currencyExact, formatDate, humanizeEnum } from "@/features/accounts/utils/format";
import {
  TABLE_PERIOD_OPTIONS,
  matchesPeriod,
  matchesQuery,
  type TablePeriod,
} from "@/features/accounts/utils/period";

const TYPE_LABEL: Record<InvoiceType, string> = {
  ENROLLMENT_PAYMENT: "Enrollment",
  DEMO_BOOKING_PAYMENT: "Demo booking",
  WALLET_TOPUP: "Wallet top-up",
  DEMO_COUPON_PURCHASE: "Demo coupons",
  CYCLE_RENEWAL_PAYMENT: "Renewal",
};

function typeLabel(type: string) {
  return TYPE_LABEL[type as InvoiceType] ?? humanizeEnum(type);
}

/**
 * Invoices (Sep 11, 2026): every payment made on the platform, one row per
 * invoice, visible to Accounts and Admin. Read-only; invoices are generated at
 * payment time (`invoice.service.ts`), so there is nothing to edit here.
 */
export default function InvoicesPanel() {
  const { invoices, loading, error } = useInvoices();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [period, setPeriod] = useState<TablePeriod>("all");

  const types = useMemo(() => Array.from(new Set(invoices.map((i) => i.type))).sort(), [invoices]);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          (!type || inv.type === type) &&
          matchesQuery(query, inv.invoiceNumber, inv.payerName, inv.payerEmail, inv.description) &&
          matchesPeriod(inv.issuedAt, period),
      ),
    [invoices, query, type, period],
  );

  const paging = usePagination(filtered, `${query}|${type}|${period}`);
  const totalAmount = filtered.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminError>{error}</AdminError>

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="invoice-search">
            <input
              id="invoice-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Invoice no. or parent"
              className={filterControlClass}
            />
          </AccountsFilterField>
          <AccountsFilterField label="Type" htmlFor="invoice-type">
            <select
              id="invoice-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={filterControlClass}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <AccountsFilterField label="Period" htmlFor="invoice-period">
            <select
              id="invoice-period"
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
              <th className={thClass}>Invoice no.</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Parent</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Description</th>
              <th className={`${thClass} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableMessageRow colSpan={6}>Loading invoices…</TableMessageRow>}
            {!loading && paging.pageItems.length === 0 && (
              <TableMessageRow colSpan={6}>No invoices found.</TableMessageRow>
            )}
            {paging.pageItems.map((inv) => (
              <tr key={inv.id} className={`${rowClass} align-top`}>
                <td className={`${tdClass} font-bold`}>{inv.invoiceNumber}</td>
                <td className={tdClass}>{formatDate(inv.issuedAt)}</td>
                <td className={tdClass}>
                  <TwoLine primary={inv.payerName} secondary={inv.payerEmail} />
                </td>
                <td className={tdClass}>
                  <StatusPill tone="brand">{typeLabel(inv.type)}</StatusPill>
                </td>
                <td className={`${tdClass} max-w-xs whitespace-normal text-admin-muted`}>{inv.description}</td>
                <td className={`${tdClass} ${numClass} font-extrabold`}>{currencyExact.format(inv.amount)}</td>
              </tr>
            ))}
          </tbody>
        </AccountsTable>

        <AccountsPagination
          from={paging.from}
          to={paging.to}
          total={paging.total}
          page={paging.page}
          pageCount={paging.pageCount}
          onPage={paging.setPage}
          noun="invoices"
          extra={<> · {currencyExact.format(totalAmount)} total</>}
        />
      </AdminPanel>
    </div>
  );
}
