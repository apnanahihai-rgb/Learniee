import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  reviewBankAccount,
  TeacherPayoutError,
} from "@/features/shared/server/teacherPayout.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

/**
 * PATCH { action: "APPROVE" | "REJECT", rejectionReason? } — Admin's
 * decision on a Teacher-submitted bank account (Bank Account
 * Approval, Sep 10, 2026). Only a PENDING row can be reviewed; a
 * Teacher who wants to fix a REJECTED one resubmits via
 * `/teacher/bank-account`, which creates a fresh PENDING row.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bankAccountId: string }> },
) {
  try {
    const { bankAccountId } = await params;

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Bank account ID is required." },
        { status: 400 },
      );
    }

    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, rejectionReason } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT." },
        { status: 400 },
      );
    }

    const adminSub = admin.sub as string;

    const bankAccount = await reviewBankAccount(
      bankAccountId,
      action,
      adminSub,
      rejectionReason,
    );

    await logActivity({
      action: "BANK_ACCOUNT_APPROVAL_DECISION",
      actorRole: "ADMIN",
      ...actorFromTokenPayload({
        sub: adminSub,
        email: admin.email as string | undefined,
        given_name: admin.given_name as string | undefined,
        family_name: admin.family_name as string | undefined,
      }),
      description: `Bank account ${action === "APPROVE" ? "approved" : "rejected"} for ${bankAccount.teacherName}.`,
      metadata: { bankAccountId: bankAccount.id, teacherId: bankAccount.teacherId, action },
    });

    return NextResponse.json({ success: true, bankAccount });
  } catch (error) {
    if (error instanceof TeacherPayoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin bank-account PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this bank account." },
      { status: 500 },
    );
  }
}
