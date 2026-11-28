import { NextResponse } from "next/server";

import { runAdminCommunityRoute } from "@/features/community/server/adminRoute";
import { listCommunityMembers } from "@/features/community/server/community.service";

/** GET: the Parents who joined this community, newest first. */
export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runAdminCommunityRoute("Admin community members GET error", "Failed to load members.", async () => {
    const { communityId } = await params;
    const members = await listCommunityMembers(communityId);

    return NextResponse.json({ success: true, members });
  });
}
