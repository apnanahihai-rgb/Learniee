import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { getWalletSummaryForParent } from "@/features/shared/server/wallet.service";

/**
 * GET
 *
 * The logged-in parent's own Wallet: current balance and recent
 * transaction history. Lazily creates the Wallet row on first call,
 * same as demo-coupons' GET route.
 *
 * Signature-verified auth (requireVerifiedParentId) — a wallet balance
 * is money data, so a forged token must not read it (06 #21).
 */
export async function GET(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const summary = await getWalletSummaryForParent(parent.parentId);

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("Parent wallet GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch your wallet." },
      { status: 500 },
    );
  }
}
