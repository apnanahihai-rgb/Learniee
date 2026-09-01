import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getEnrollmentsForParent } from "@/features/parent/server/enrollment.service";

/**
 * GET
 *
 * Lists every enrollment made by the logged-in parent. Not wired
 * into a screen yet (Payments/My Enrollments is still a Section-4
 * "Not Started" item — see 01-PROJECT-STATUS.md) — kept here
 * alongside POST so the read path doesn't need to be built later
 * from scratch.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const enrollments = await getEnrollmentsForParent(parent.parentId);

    return NextResponse.json({ success: true, enrollments });
  } catch (error) {
    console.error("Parent enrollments GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch enrollments." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * REMOVED (resolves 06-OPEN-DECISIONS.md #36): Enrollment creation
 * now requires a completed Razorpay payment, so a direct
 * "create with no charge" POST no longer exists. Use:
 *   1. POST /api/parent/enrollments/order  — prices + creates a
 *      Razorpay order
 *   2. POST /api/parent/enrollments/verify — verifies payment and
 *      creates the Enrollment row
 * Kept as a 410 here (rather than deleting the export) so any old
 * client build still gets a clear, actionable error instead of a
 * generic 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct enrollment is no longer supported — pay first via /api/parent/enrollments/order then /api/parent/enrollments/verify.",
    },
    { status: 410 },
  );
}
