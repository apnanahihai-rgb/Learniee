import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  getOngoingCycleRows,
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsDashboardShell from "@/features/accounts/components/AccountsDashboardShell";

export default async function AdminAccountsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/login");
  }

  const [ongoingCycleRows, ledgerRows, demoRows] = await Promise.all([
    getOngoingCycleRows(),
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <div className="min-h-screen bg-gray-50">
      <AccountsDashboardShell
        heading="Accounts"
        subheading="Same ledger the Accounts team sees — tuition + demo revenue, exportable as Excel."
        summary={summary}
        ongoingCycleRows={ongoingCycleRows}
        ledgerRows={ledgerRows}
        demoRows={demoRows}
      />
    </div>
  );
}
