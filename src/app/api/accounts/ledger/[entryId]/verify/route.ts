import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import {
  approveLedgerPayout,
  rejectLedgerPayout,
  TuitionLedgerError,
} from "@/features/shared/server/tuitionLedger.service";

/**
 * PATCH — Monthly Payout Verification (08-PROJECT-KNOWLEDGE-BASE.md):
 * Accounts (or Admin) approves or rejects one cycle's teacher payout.
 *
 * body: { action: "APPROVE" }
 * body: { action: "REJECT", reason?: string }
 *
 * Allowed even past `verificationDeadline` — a missed 1-day window is
 * surfaced as `isOverdue` for Admin/Accounts to notice, not a hard
 * lock that would force money to sit undecided forever.
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
    const { action } = body;
    const staffSub = auth.sub as string;

    let entry;

    if (action === "APPROVE") {
      entry = await approveLedgerPayout(entryId, staffSub);
    } else if (action === "REJECT") {
      entry = await rejectLedgerPayout(entryId, staffSub, body.reason);
    } else {
      return NextResponse.json({ error: "action must be APPROVE or REJECT." }, { status: 400 });
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
