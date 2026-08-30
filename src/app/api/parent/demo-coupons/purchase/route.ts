import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";

/**
 * POST
 *
 * Placeholder for buying extra demo coupons beyond the 2 free ones,
 * in multiples of ₹100 (one coupon = one flat-rate demo booking,
 * per 06-OPEN-DECISIONS.md #26). Intentionally returns 501 instead
 * of silently incrementing DemoCoupon.totalIssued — Razorpay isn't
 * integrated yet (02-ARCHITECTURE.md), and granting coupons with no
 * real charge behind them would be a real-money bug waiting to
 * happen.
 *
 * Once the payment gateway exists: verify the Razorpay payment
 * here first, then call a new
 * `incrementDemoCouponAllowance(parentId, quantity)` in
 * demoCoupon.service.ts to bump `totalIssued` by the purchased
 * quantity — do not just trust the client-supplied `quantity`
 * without a matching verified charge amount.
 */
export async function POST(req: Request) {
  const parent = await requireParentId(req);

  if ("error" in parent) {
    return parent.error;
  }

  return NextResponse.json(
    {
      error:
        "Buying extra demo coupons isn't available yet — online payments aren't wired up. Check back soon.",
    },
    { status: 501 },
  );
}
