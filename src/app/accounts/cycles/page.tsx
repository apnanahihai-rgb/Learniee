import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getOngoingCycleRows } from "@/features/accounts/server/export.service";
import OngoingCyclesPanel from "@/features/accounts/components/OngoingCyclesPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsCyclesPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  const rows = await getOngoingCycleRows();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Ongoing Cycles" }]}
        title="Ongoing cycles"
        description="Cycles in progress: the parent has paid, and the teacher payout is not decided until the cycle completes."
      />
      <OngoingCyclesPanel rows={rows} />
    </AdminPage>
  );
}
