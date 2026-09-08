import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  getReferralSummaryForParent,
  ReferralError,
} from "@/features/shared/server/referral.service";

/**
 * GET — this Parent's own shareable referral code (generated on
 * first call), every referral they've made, and total earned so
 * far. Nothing to POST here — a code is only ever *redeemed* during
 * a new Parent's onboarding (`/api/onboarding/parent-info`), never
 * via a direct call from this route.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const summary = await getReferralSummaryForParent(parent.parentId);

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    if (error instanceof ReferralError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent referral GET error:", error);

    return NextResponse.json(
      { error: "Failed to load your referral details." },
      { status: 500 },
    );
  }
}
