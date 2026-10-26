import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { getRatingBoard } from "@/features/admin/server/ratingBoard.service";
import { BOTTOM_PERCENT, MIN_REVIEWS_TO_RANK } from "@/features/admin/config/ratingBoard";

/** GET — every course and teacher with review average + rank, lowest first. Admin only (verified). */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await getRatingBoard();

    return NextResponse.json({
      success: true,
      ...board,
      bottomPercent: BOTTOM_PERCENT,
      minReviews: MIN_REVIEWS_TO_RANK,
    });
  } catch (error) {
    console.error("Admin rating board error:", error);

    return NextResponse.json({ error: "Failed to load ratings." }, { status: 500 });
  }
}
