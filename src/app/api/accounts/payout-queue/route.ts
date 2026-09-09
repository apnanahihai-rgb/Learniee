import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { listPaymentQueueGroupedByTeacher } from "@/features/shared/server/teacherPayout.service";

/**
 * GET — Accounts' Payment tab (Teacher Payouts, Sep 9, 2026).
 * Every QUEUED_FOR_PAYMENT cycle, grouped by teacher, so Accounts can
 * select several teachers and mass-pay them in one action instead of
 * approving/paying cycle-by-cycle.
 */
export async function GET() {
  try {
    const auth = await requireAdminOrAccounts();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await listPaymentQueueGroupedByTeacher();

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Accounts payout-queue GET error:", error);
    return NextResponse.json({ error: "Failed to load the payment queue." }, { status: 500 });
  }
}
