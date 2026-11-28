import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { getCommunityForParent } from "@/features/community/server/communityParent.service";

/** GET — one community; its files are listed only when this Parent has joined. */
export async function GET(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runParentCommunityRoute(req, "Parent community GET error", "Failed to load the community.", async (parentId) => {
    const { communityId } = await params;
    const community = await getCommunityForParent(communityId, parentId);

    return NextResponse.json({ success: true, community });
  });
}
