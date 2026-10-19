import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getParentNextAction } from "@/features/parent/server/nextAction.service";

/** GET — the one dashboard "next best action" card for the logged-in Parent. */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const action = await getParentNextAction(parent.parentId);

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Parent next-action GET error:", error);

    return NextResponse.json({ error: "Failed to load your next step." }, { status: 500 });
  }
}
