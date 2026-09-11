import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { listInvoicesForAccounts } from "@/features/shared/server/invoice.service";

/**
 * GET — every Invoice across every parent, newest first, with the
 * payer's name/email attached. Restricted to Admin and Accounts
 * logins, signature-verified (money-adjacent, 06-OPEN-DECISIONS.md
 * #21) — same level as the Tuition Ledger / Parent Wallets routes.
 */
export async function GET() {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await listInvoicesForAccounts();

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Accounts invoices GET error:", error);

    return NextResponse.json(
      { error: "Failed to load invoices." },
      { status: 500 },
    );
  }
}
