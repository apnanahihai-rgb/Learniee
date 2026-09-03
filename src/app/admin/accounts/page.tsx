import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsExportDashboard from "@/features/accounts/components/AccountsExportDashboard";

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
    <AccountsExportDashboard
      heading="Accounts"
      subheading="Same ledger the Accounts team sees — tuition + demo revenue, exportable as Excel."
      summary={summary}
      ledgerRows={ledgerRows}
      demoRows={demoRows}
    />
  );
}
