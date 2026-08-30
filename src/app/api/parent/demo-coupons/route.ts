import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getDemoCouponBalance } from "@/features/parent/server/demoCoupon.service";

/**
 * GET
 *
 * The logged-in parent's demo coupon balance: how many of the 2
 * account-level free demos are left, and the flat paid-demo price
 * once they run out (06-OPEN-DECISIONS.md #26). Lazily creates the
 * DemoCoupon row on first call — see getOrCreateDemoCoupon().
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const balance = await getDemoCouponBalance(parent.parentId);

    return NextResponse.json({ success: true, ...balance });
  } catch (error) {
    console.error("Parent demo-coupons GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch demo coupon balance." },
      { status: 500 },
    );
  }
}
