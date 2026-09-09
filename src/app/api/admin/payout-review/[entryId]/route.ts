import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  adminReleaseLedgerPayout,
  adminReopenLedgerPayout,
  adminConfirmRejectLedgerPayout,
  TuitionLedgerError,
} from "@/features/shared/server/tuitionLedger.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

/**
 * PATCH — Admin's decision on an ON_HOLD/REJECTED payout (Teacher
 * Payouts, Sep 9, 2026).
 *
 * body: { action: "RELEASE" }   -> straight to Payment Queue
 * body: { action: "REOPEN" }    -> back to Accounts' Verify tab, fresh 24h window
 * body: { action: "CONFIRM_REJECT" } -> terminal rejection
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId } = await params;

    if (!entryId) {
      return NextResponse.json({ error: "Ledger entry ID is required." }, { status: 400 });
    }

    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const adminSub = admin.sub as string;

    let entry;

    if (action === "RELEASE") {
      entry = await adminReleaseLedgerPayout(entryId, adminSub);
    } else if (action === "REOPEN") {
      entry = await adminReopenLedgerPayout(entryId, adminSub);
    } else if (action === "CONFIRM_REJECT") {
      entry = await adminConfirmRejectLedgerPayout(entryId, adminSub);
    } else {
      return NextResponse.json(
        { error: "action must be RELEASE, REOPEN, or CONFIRM_REJECT." },
        { status: 400 },
      );
    }

    await logActivity({
      action: "PAYOUT_ADMIN_DECISION",
      actorRole: "ADMIN",
      ...actorFromTokenPayload({
        sub: adminSub,
        email: admin.email as string | undefined,
        given_name: admin.given_name as string | undefined,
        family_name: admin.family_name as string | undefined,
      }),
      description: `Payout for ${entry.teacherName} (cycle #${entry.cycleNumber}): ${action.toLowerCase().replace("_", " ")}.`,
      metadata: { ledgerEntryId: entry.id, teacherId: entry.teacherId, action },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (error instanceof TuitionLedgerError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin payout-review PATCH error:", error);
    return NextResponse.json({ error: "Failed to update this payout." }, { status: 500 });
  }
}
