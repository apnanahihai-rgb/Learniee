import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getWalletSummaryForParent } from "@/features/shared/server/wallet.service";

/**
 * GET
 *
 * The logged-in parent's own Wallet: current balance and recent
 * transaction history. Lazily creates the Wallet row on first call,
 * same as demo-coupons' GET route.
 *
 * Read-only, decode-only Cognito auth (requireParentId) — same
 * level as every other Parent GET route today. Signature
 * verification is reserved for routes that WRITE money
 * (verifiedAuth.ts's requireVerifiedParentId, used only by the four
 * Razorpay order/verify routes) — see 06-OPEN-DECISIONS.md #21.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

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
