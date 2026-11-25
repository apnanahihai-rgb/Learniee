"use client";

import { useState } from "react";

import type { DemoBookingRow, OngoingCycleRow } from "@/features/accounts/server/export.service";
import { useTuitionLedger } from "@/features/accounts/hooks/useTuitionLedger";
import AccountsAnalyticsPanel from "@/features/accounts/components/AccountsAnalyticsPanel";
import DemoBookingsPanel from "@/features/accounts/components/DemoBookingsPanel";
import InvoicesPanel from "@/features/accounts/components/InvoicesPanel";
import OngoingCyclesPanel from "@/features/accounts/components/OngoingCyclesPanel";
import PaymentQueuePanel from "@/features/accounts/components/PaymentQueuePanel";
import TuitionLedgerPanel from "@/features/accounts/components/TuitionLedgerPanel";
import WalletPanel from "@/features/accounts/components/WalletPanel";
import AccountsOverviewTab, {
  type AdminAccountsSummary,
} from "@/features/admin/components/accounts/AccountsOverviewTab";
import RevenueLedgerTab from "@/features/admin/components/accounts/RevenueLedgerTab";
import { AdminPillTabs } from "@/features/admin/components/ui/design";

type TabId =
  | "overview"
  | "cycles"
  | "verify"
  | "queue"
  | "revenue"
  | "demos"
  | "wallets"
  | "invoices"
  | "analytics";

const TABS: Array<{ value: TabId; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "cycles", label: "Ongoing Cycles" },
  { value: "verify", label: "Verify Payouts" },
  { value: "queue", label: "Payment Queue" },
  { value: "revenue", label: "Revenue Ledger" },
  { value: "demos", label: "Demo Bookings" },
  { value: "wallets", label: "Parent Wallets" },
  { value: "invoices", label: "Invoices" },
  { value: "analytics", label: "Analytics" },
];

interface AdminAccountsBoardProps {
  summary: AdminAccountsSummary;
  ongoingCycleRows: OngoingCycleRow[];
  demoRows: DemoBookingRow[];
}

/**
 * Admin "Accounts" (design 16): nine pill tabs. Overview and Revenue Ledger
 * use the new design; the other tabs keep the working Accounts panels (the
 * design leaves them as "part of the full Accounts area").
 */
export default function AdminAccountsBoard({
  summary,
  ongoingCycleRows,
  demoRows,
}: AdminAccountsBoardProps) {
  const [tab, setTab] = useState<TabId>("overview");
  // One ledger fetch feeds both Verify Payouts and the Revenue Ledger.
  const ledger = useTuitionLedger();

  return (
    <>
      <AdminPillTabs tabs={TABS} value={tab} onChange={setTab} label="Accounts sections" />

      <div role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.label}>
        {tab === "overview" && <AccountsOverviewTab summary={summary} />}
        {tab === "cycles" && <OngoingCyclesPanel rows={ongoingCycleRows} />}
        {tab === "verify" && (
          <TuitionLedgerPanel
            entries={ledger.entries}
            summary={ledger.summary}
            loading={ledger.loading}
            error={ledger.error}
            actingOn={ledger.actingOn}
            proceed={ledger.proceed}
            hold={ledger.hold}
            reject={ledger.reject}
          />
        )}
        {tab === "queue" && <PaymentQueuePanel />}
        {tab === "revenue" && (
          <RevenueLedgerTab entries={ledger.entries} loading={ledger.loading} error={ledger.error} />
        )}
        {tab === "demos" && <DemoBookingsPanel rows={demoRows} />}
        {tab === "wallets" && <WalletPanel />}
        {tab === "invoices" && <InvoicesPanel />}
        {tab === "analytics" && <AccountsAnalyticsPanel />}
      </div>
    </>
  );
}
