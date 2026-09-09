import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { massPayTeachers, TeacherPayoutError } from "@/features/shared/server/teacherPayout.service";

/**
 * POST — mass-pay (Teacher Payouts, Sep 9, 2026).
 *
 * body: { teacherIds: string[] }
 *
 * Pays every currently-QUEUED_FOR_PAYMENT cycle for each selected
 * teacher in one batch. A teacher with no BankAccount on file is
 * skipped (not failed) — see `massPayTeachers()`'s doc-comment.
 *
 * NOTE: the actual transfer is a STUB — RazorpayX Payouts isn't
 * confirmed enabled yet (06-OPEN-DECISIONS.md #46). See
 * src/lib/teacherPayoutGateway.ts.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrAccounts();

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const teacherIds: unknown = body?.teacherIds;

    if (!Array.isArray(teacherIds) || teacherIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "teacherIds must be an array of strings." }, { status: 400 });
    }

    const staffSub = auth.sub as string;
    const result = await massPayTeachers(teacherIds, staffSub);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof TeacherPayoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Accounts payout-queue pay POST error:", error);
    return NextResponse.json({ error: "Failed to process the mass payout." }, { status: 500 });
  }
}
