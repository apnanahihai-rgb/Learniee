import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { creditWallet, WalletError } from "@/features/shared/server/wallet.service";

/**
 * POST — manually credits a parent's Wallet. This is the only way
 * money enters a Wallet today (06-OPEN-DECISIONS.md #28: refunds
 * credit the Wallet, never the original payment method) — there's
 * no automatic refund-to-wallet flow yet, so Accounts/Admin does
 * this by hand, e.g. to fulfil a "contact support for a refund"
 * promise made elsewhere in the app.
 *
 * Body: { parentId: string, amount: number, reason: string }
 *
 * Restricted to Admin and Accounts logins, signature-verified
 * (writes real money-equivalent balance — 06-OPEN-DECISIONS.md #21).
 */
export async function POST(req: Request) {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { parentId, amount, reason } = body ?? {};

    if (!parentId || typeof parentId !== "string") {
      return NextResponse.json({ error: "parentId is required." }, { status: 400 });
    }

    const result = await creditWallet({
      parentId,
      amount: Number(amount),
      reason: typeof reason === "string" ? reason : "",
      referenceType: "MANUAL_ADJUSTMENT",
      createdByStaffSub: auth.sub,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Accounts wallet credit POST error:", error);

    return NextResponse.json(
      { error: "Failed to credit this parent's wallet." },
      { status: 500 },
    );
  }
}
