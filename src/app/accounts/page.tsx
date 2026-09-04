import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import {
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsExportDashboard from "@/features/accounts/components/AccountsExportDashboard";
import TuitionLedgerPanel from "@/features/accounts/components/TuitionLedgerPanel";

export default async function AccountsDashboardPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  const [ledgerRows, demoRows] = await Promise.all([
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-8 pt-8">
        <TuitionLedgerPanel />
      </div>
      <AccountsExportDashboard
        heading="Accounts Dashboard"
        subheading="Tuition ledger and demo revenue, with an Excel export."
        summary={summary}
        ledgerRows={ledgerRows}
        demoRows={demoRows}
      />
    </>
  );
}
