import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import InvoicesPanel from "@/features/accounts/components/InvoicesPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsInvoicesPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Invoices" }]}
        title="Invoices"
        description="Issued invoices, searchable by parent or invoice number."
      />
      <InvoicesPanel />
    </AdminPage>
  );
}
