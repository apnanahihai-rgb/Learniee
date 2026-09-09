import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listPendingAdminPayoutReview } from "@/features/shared/server/tuitionLedger.service";

/**
 * GET — Admin's payout-review queue (Teacher Payouts, Sep 9, 2026).
 * Every ON_HOLD/REJECTED cycle Accounts flagged, not yet reviewed by
 * Admin. Signature-verified (`requireAdmin`), same as every other
 * money-adjacent route (06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await listPendingAdminPayoutReview();

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Admin payout-review GET error:", error);
    return NextResponse.json({ error: "Failed to load the payout review queue." }, { status: 500 });
  }
}
