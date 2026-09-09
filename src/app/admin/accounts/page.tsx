import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
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

  const [ledgerRows, demoRows] = await Promise.all([
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <AccountsDashboardShell
      heading="Accounts"
      subheading="Same ledger the Accounts team sees — tuition + demo revenue, exportable as Excel."
      summary={summary}
      ledgerRows={ledgerRows}
      demoRows={demoRows}
    />
  );
}
