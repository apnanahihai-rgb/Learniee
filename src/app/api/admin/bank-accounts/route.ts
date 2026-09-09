import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listBankAccountsForAdmin } from "@/features/shared/server/teacherPayout.service";

/**
 * GET — every Teacher's bank account (Bank Account Approval, Sep 10,
 * 2026), newest-submitted first. Signature-verified admin auth, same
 * as every other money-adjacent Admin/Accounts route (payout-review,
 * ledger, wallet-credit) — see 06-OPEN-DECISIONS.md #21.
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bankAccounts = await listBankAccountsForAdmin();

    return NextResponse.json({ success: true, bankAccounts });
  } catch (error) {
    console.error("Admin bank-accounts GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch bank accounts." },
      { status: 500 },
    );
  }
}
