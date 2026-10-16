import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import AccountsComplaintsBoard from "@/features/accounts/components/AccountsComplaintsBoard";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

/** Accounts complaints only. The API scopes by the verified role too. */
export default async function AccountsComplaintsPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Complaints" }]}
        title="Accounts complaints"
        description="Payment and billing complaints, scoped to the Accounts department."
      />
      <AccountsComplaintsBoard apiBase="/api/staff/complaints" />
    </AdminPage>
  );
}
