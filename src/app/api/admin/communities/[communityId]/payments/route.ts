import { NextResponse } from "next/server";

import { runAdminCommunityRoute } from "@/features/community/server/adminRoute";
import { listCommunityPayments } from "@/features/community/server/communityPayment.service";

/** GET: who paid for this community (paid and refunded), newest first, with totals. */
export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runAdminCommunityRoute("Admin community payments GET error", "Failed to load payments.", async () => {
    const { communityId } = await params;
    const { payments, summary } = await listCommunityPayments(communityId);

    return NextResponse.json({ success: true, payments, summary });
  });
}
