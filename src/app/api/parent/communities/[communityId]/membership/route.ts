import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { joinCommunity, leaveCommunity } from "@/features/community/server/communityParent.service";

/** POST — join a free community (no payment). Joining twice is harmless. */
export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runParentCommunityRoute(req, "Parent community join error", "Failed to join the community.", async (parentId) => {
    const { communityId } = await params;

    await joinCommunity(communityId, parentId);

    return NextResponse.json({ success: true });
  });
}

/** DELETE — leave a community. Leaving twice is harmless. */
export async function DELETE(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runParentCommunityRoute(req, "Parent community leave error", "Failed to leave the community.", async (parentId) => {
    const { communityId } = await params;

    await leaveCommunity(communityId, parentId);

    return NextResponse.json({ success: true });
  });
}
