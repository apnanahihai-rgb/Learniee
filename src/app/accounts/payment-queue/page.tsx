import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import PaymentQueuePanel from "@/features/accounts/components/PaymentQueuePanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsPaymentQueuePage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Payment Queue" }]}
        title="Payment queue"
        description="Teachers with approved cycles waiting to be paid."
      />
      <PaymentQueuePanel />
    </AdminPage>
  );
}
