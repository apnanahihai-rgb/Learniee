import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { listCommunitiesForParent } from "@/features/community/server/communityParent.service";

/** GET — every visible (not hidden) community, with whether this Parent has joined. */
export async function GET(req: Request) {
  return runParentCommunityRoute(req, "Parent communities GET error", "Failed to load communities.", async (parentId) => {
    const communities = await listCommunitiesForParent(parentId);

    return NextResponse.json({ success: true, communities });
  });
}
