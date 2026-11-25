import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  getOngoingCycleRows,
  getTuitionLedgerRows,
  getDemoBookingRows,
  getAccountsSummary,
} from "@/features/accounts/server/export.service";
import AdminAccountsBoard from "@/features/admin/components/accounts/AdminAccountsBoard";
import { AdminHead, AdminStack } from "@/features/admin/components/ui/design";

/**
 * Admin "Accounts" (design 16). Server page: verified Admin check, then the
 * headline summary, ongoing cycles and demo bookings are read once here; the
 * tabs fetch their own live data (ledger, invoices, wallets, queue).
 */
export default async function AdminAccountsPage() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/login");
  }

  const [ongoingCycleRows, ledgerRows, demoRows] = await Promise.all([
    getOngoingCycleRows(),
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);
  const summary = await getAccountsSummary(ledgerRows, demoRows);

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Money" }]}
        title="Accounts"
        description="Revenue, cycles, payouts, wallets and invoices in one place."
      />
      <AdminAccountsBoard summary={summary} ongoingCycleRows={ongoingCycleRows} demoRows={demoRows} />
    </AdminStack>
  );
}
