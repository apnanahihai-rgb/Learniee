import { redirect } from "next/navigation";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getDemoBookingRows } from "@/features/accounts/server/export.service";
import DemoBookingsPanel from "@/features/accounts/components/DemoBookingsPanel";
import { AdminPage, AdminPageHeader } from "@/features/admin/components/ui/primitives";

export default async function AccountsDemoBookingsPage() {
  const auth = await requireAdminOrAccounts();
  if (!auth) {
    redirect("/login");
  }

  const rows = await getDemoBookingRows();

  return (
    <AdminPage>
      <AdminPageHeader
        crumbs={[{ label: "Accounts", href: "/accounts" }, { label: "Demo Bookings" }]}
        title="Demo bookings"
        description="Paid trial classes and their Razorpay references."
      />
      <DemoBookingsPanel rows={rows} />
    </AdminPage>
  );
}
