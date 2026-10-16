import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import WalletPanel from "@/features/accounts/components/WalletPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsWalletsPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Parent Wallets" }]}
        title="Parent wallets"
        description="Balances, with manual credits."
      />
      <WalletPanel />
    </AdminPage>
  );
}
