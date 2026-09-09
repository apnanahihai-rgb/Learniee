import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import {
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsDashboardShell from "@/features/accounts/components/AccountsDashboardShell";

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
    <AccountsDashboardShell
      heading="Accounts Dashboard"
      subheading="Tuition ledger and demo revenue, with an Excel export."
      summary={summary}
      ledgerRows={ledgerRows}
      demoRows={demoRows}
    />
  );
}
