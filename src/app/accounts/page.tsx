import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import {
  getOngoingCycleRows,
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AccountsOverview from "@/features/accounts/components/AccountsOverview";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsDashboardPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  const [ongoingCycleRows, ledgerRows, demoRows] = await Promise.all([
    getOngoingCycleRows(),
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts" }, { label: "Overview" }]}
        title="Accounts dashboard"
        description="Tuition ledger and demo revenue, with an Excel export."
      />
      <AccountsOverview summary={summary} ongoingCycleRows={ongoingCycleRows} />
    </AdminPage>
  );
}
