import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import VerifyPayoutsView from "@/features/accounts/components/VerifyPayoutsView";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsVerifyPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Verify Payouts" }]}
        title="Verify payouts"
        description="Approve or reject completed cycles before the teacher joins the payment queue."
      />
      <VerifyPayoutsView />
    </AdminPage>
  );
}
