import { NextResponse } from "next/server";

import { runAdminCommunityRoute } from "@/features/community/server/adminRoute";
import { removeCommunityMember } from "@/features/community/server/community.service";

/** DELETE: remove a member from a community. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ communityId: string; memberId: string }> },
) {
  return runAdminCommunityRoute("Admin community member DELETE error", "Failed to remove the member.", async (actor) => {
    const { communityId, memberId } = await params;

    await removeCommunityMember(communityId, memberId, actor);

    return NextResponse.json({ success: true });
  });
}
