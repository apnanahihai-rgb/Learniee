import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getTuitionLedgerRows } from "@/features/accounts/server/export.service";
import RevenueLedgerPanel from "@/features/accounts/components/RevenueLedgerPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsRevenuePage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  const rows = await getTuitionLedgerRows();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Revenue Ledger" }]}
        title="Revenue ledger"
        description="Every tuition payment, newest first."
      />
      <RevenueLedgerPanel rows={rows} />
    </AdminPage>
  );
}
