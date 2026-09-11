import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { listInvoicesForParent } from "@/features/shared/server/invoice.service";

/**
 * GET
 *
 * The logged-in parent's own Invoices (Enrollment payments, paid
 * Demo bookings, Wallet top-ups), newest first — `/parent/payments`.
 *
 * Read-only, decode-only Cognito auth (requireParentId) — same level
 * as every other Parent GET route (06-OPEN-DECISIONS.md #21). Only
 * the routes that WRITE money use signature-verified auth.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const invoices = await listInvoicesForParent(parent.parentId);

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Parent invoices GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch your invoices." },
      { status: 500 },
    );
  }
}
