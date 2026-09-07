import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { listParentWalletsForAccounts } from "@/features/shared/server/wallet.service";

/**
 * GET — every parent's Wallet balance, for Accounts/Admin oversight.
 * Restricted to Admin and Accounts logins, signature-verified
 * (money-adjacent, same guard as /api/accounts/ledger —
 * 06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallets = await listParentWalletsForAccounts();
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return NextResponse.json({
      wallets,
      summary: { totalBalance, walletCount: wallets.length },
    });
  } catch (error) {
    console.error("Accounts wallet GET error:", error);

    return NextResponse.json(
      { error: "Failed to load parent wallets." },
      { status: 500 },
    );
  }
}
