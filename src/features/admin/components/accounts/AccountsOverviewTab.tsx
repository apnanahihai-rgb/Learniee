"use client";

import { useInvoices } from "@/features/accounts/hooks/useInvoices";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminLoadingState,
  AdminStats,
  type AdminColumn,
} from "@/features/admin/components/ui/design";
import { adminTag } from "@/features/admin/components/ui/adminStyles";
import { currency, currencyAuto, formatDate, invoiceTypeLabel } from "@/features/accounts/utils/format";
import type { AccountsInvoiceRow } from "@/features/accounts/hooks/useInvoices";

export interface AdminAccountsSummary {
  totalTuitionRevenue: number;
  totalDemoRevenue: number;
  totalEnrollments: number;
  dueSoonCount: number;
}

const RECENT_INVOICE_COUNT = 5;

const COLUMNS: Array<AdminColumn<AccountsInvoiceRow>> = [
  {
    label: "Invoice",
    block: true,
    render: (inv) => <b className="font-semibold">{inv.invoiceNumber}</b>,
  },
  { label: "Payer", render: (inv) => inv.payerName },
  {
    label: "Type",
    render: (inv) => <span className={adminTag("violet")}>{invoiceTypeLabel(inv.type)}</span>,
  },
  { label: "Amount", render: (inv) => currencyAuto.format(inv.amount) },
  { label: "Date", nowrap: true, render: (inv) => formatDate(inv.issuedAt) },
];

/**
 * Accounts "Overview" tab (design 16): four headline numbers and the latest
 * invoices. Numbers come from the server (`getAccountsSummary`); invoices
 * from GET /api/accounts/invoices (verified Admin/Accounts auth, live refresh).
 */
export default function AccountsOverviewTab({ summary }: { summary: AdminAccountsSummary }) {
  const { invoices, loading, error } = useInvoices();

  const recent = [...invoices]
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, RECENT_INVOICE_COUNT);

  return (
    <>
      <AdminStats
        items={[
          { label: "Tuition Revenue", value: currency.format(summary.totalTuitionRevenue) },
          { label: "Demo Revenue", value: currency.format(summary.totalDemoRevenue) },
          { label: "Enrollments", value: summary.totalEnrollments },
          { label: "Due Within 5 Days", value: summary.dueSoonCount },
        ]}
      />

      <div className="mt-6">
        <AdminErrorNote>{error}</AdminErrorNote>
        {loading ? (
          <AdminLoadingState message="Loading invoices…" />
        ) : recent.length === 0 ? (
          <AdminEmptyState title="No invoices yet" message="Payments will show up here as they come in." />
        ) : (
          <AdminDataTable columns={COLUMNS} rows={recent} rowKey={(inv) => inv.id} />
        )}
      </div>
    </>
  );
}
