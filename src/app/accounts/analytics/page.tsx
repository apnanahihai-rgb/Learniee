import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import AccountsAnalyticsPanel from "@/features/accounts/components/AccountsAnalyticsPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsAnalyticsPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Analytics" }]}
        title="Analytics"
        description="Revenue, expense and payout status for the period you choose."
      />
      <AccountsAnalyticsPanel />
    </AdminPage>
  );
}
