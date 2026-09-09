import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import {
  proceedLedgerPayout,
  holdLedgerPayout,
  rejectLedgerPayout,
  TuitionLedgerError,
} from "@/features/shared/server/tuitionLedger.service";
import { notifyPayoutHeldOrRejected } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * PATCH — Accounts' Verify tab (Teacher Payouts, Sep 9, 2026).
 *
 * body: { action: "PROCEED" }                    -> straight to Payment Queue
 * body: { action: "HOLD", reason?: string }       -> routed to Admin for review
 * body: { action: "REJECT", reason?: string }     -> also routed to Admin (NOT terminal until Admin confirms)
 *
 * Allowed even past `verificationDeadline` / from EXPIRED — a missed
 * 1-day window is surfaced as `isOverdue` for Accounts to notice, not
 * a hard lock that would force money to sit undecided forever.
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

    const auth = await requireAdminOrAccounts();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;
    const staffSub = auth.sub as string;

    let entry;

    if (action === "PROCEED") {
      entry = await proceedLedgerPayout(entryId, staffSub);
    } else if (action === "HOLD") {
      entry = await holdLedgerPayout(entryId, staffSub, reason);
      await notifyPayoutHeldOrRejected(entry.teacherId, "HOLD", reason);
      await logActivity({
        action: "PAYOUT_HELD_OR_REJECTED",
        actorRole: "ACCOUNTS",
        actorId: staffSub,
        description: `Payout for ${entry.teacherName} (cycle #${entry.cycleNumber}) put on hold${reason ? `: ${reason}` : "."}`,
        metadata: { ledgerEntryId: entry.id, teacherId: entry.teacherId, decision: "HOLD" },
      });
    } else if (action === "REJECT") {
      entry = await rejectLedgerPayout(entryId, staffSub, reason);
      await notifyPayoutHeldOrRejected(entry.teacherId, "REJECT", reason);
      await logActivity({
        action: "PAYOUT_HELD_OR_REJECTED",
        actorRole: "ACCOUNTS",
        actorId: staffSub,
        description: `Payout for ${entry.teacherName} (cycle #${entry.cycleNumber}) rejected${reason ? `: ${reason}` : "."}`,
        metadata: { ledgerEntryId: entry.id, teacherId: entry.teacherId, decision: "REJECT" },
      });
    } else {
      return NextResponse.json(
        { error: "action must be PROCEED, HOLD, or REJECT." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    if (error instanceof TuitionLedgerError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Accounts ledger verify PATCH error:", error);
    return NextResponse.json({ error: "Failed to update this payout." }, { status: 500 });
  }
}
