"use client";

import Link from "next/link";

import type { OngoingCycleRow } from "@/features/accounts/server/export.service";
import { useAccountsLedger } from "@/features/accounts/components/layout/AccountsLedgerContext";
import { OngoingCyclesTable } from "@/features/accounts/components/OngoingCyclesPanel";
import {
  AccountsKpiStrip,
  AccountsPanelHeader,
  ExportLink,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currency } from "@/features/accounts/utils/format";
import { useAdminComplaints } from "@/features/admin/hooks/useComplaints";
import { AdminPanel, adminButtonClass } from "@/features/admin/components/ui/primitives";

interface AccountsOverviewProps {
  summary: {
    totalTuitionRevenue: number;
    totalDemoRevenue: number;
    totalEnrollments: number;
    dueSoonCount: number;
  };
  ongoingCycleRows: OngoingCycleRow[];
}

/**
 * Accounts landing screen: headline revenue numbers, the three queues that need
 * action (with live counts), and the cycles currently in progress.
 */
export default function AccountsOverview({ summary, ongoingCycleRows }: AccountsOverviewProps) {
  const { summary: ledger } = useAccountsLedger();
  const { complaints } = useAdminComplaints("/api/staff/complaints");

  const openComplaints = complaints.filter((c) => c.status === "OPEN").length;

  return (
    <>
      <AccountsKpiStrip
        items={[
          { label: "Tuition revenue", value: currency.format(summary.totalTuitionRevenue) },
          { label: "Demo revenue", value: currency.format(summary.totalDemoRevenue) },
          { label: "Enrollments", value: summary.totalEnrollments },
          {
            label: "Due within 5 days",
            value: summary.dueSoonCount,
            tone: summary.dueSoonCount > 0 ? "warn" : "default",
          },
        ]}
      />

      <AdminPanel className="overflow-hidden">
        <AccountsPanelHeader
          title="Needs your action"
          actions={
            <>
              <Link href="/accounts/complaints" className={adminButtonClass("secondary")}>
                Complaints
              </Link>
              <ExportLink href={EXPORT_HREF} />
            </>
          }
        />
        <AccountsKpiStrip
          bare
          items={[
            {
              label: "Verify payouts",
              value: ledger ? ledger.pendingVerificationCount : "—",
              action: (
                <Link href="/accounts/verify" className={adminButtonClass("secondary")}>
                  Review
                </Link>
              ),
            },
            {
              label: "Payment queue",
              value: ledger ? ledger.queuedForPaymentCount : "—",
              action: (
                <Link href="/accounts/payment-queue" className={adminButtonClass("secondary")}>
                  Open queue
                </Link>
              ),
            },
            {
              label: "Open complaints",
              value: openComplaints,
              action: (
                <Link href="/accounts/complaints" className={adminButtonClass("secondary")}>
                  View
                </Link>
              ),
            },
          ]}
        />
      </AdminPanel>

      <AdminPanel className="overflow-hidden">
        <AccountsPanelHeader
          title="Ongoing cycles"
          description="Parent paid upfront; payout is decided when the cycle completes."
          actions={
            <Link href="/accounts/cycles" className={adminButtonClass("secondary")}>
              See all
            </Link>
          }
        />
        <OngoingCyclesTable rows={ongoingCycleRows} variant="compact" />
      </AdminPanel>
    </>
  );
}
