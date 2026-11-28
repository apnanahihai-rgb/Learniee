import { NextResponse } from "next/server";

import { runAdminCommunityRoute, readJsonBody } from "@/features/community/server/adminRoute";
import { getCommunityDetail, updateCommunity } from "@/features/community/server/community.service";

type Ctx = { params: Promise<{ communityId: string }> };

/** GET: one community with its files (each with a short-lived download link). */
export async function GET(_req: Request, { params }: Ctx) {
  return runAdminCommunityRoute("Admin community GET error", "Failed to load the community.", async () => {
    const { communityId } = await params;
    const community = await getCommunityDetail(communityId);

    return NextResponse.json({ success: true, community });
  });
}

/**
 * PATCH { title?, description?, isPaid?, price?, status? }
 * Edit a community, or hide / show it with `status: "HIDDEN" | "ACTIVE"`.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  return runAdminCommunityRoute("Admin community PATCH error", "Failed to update the community.", async () => {
    const { communityId } = await params;
    const community = await updateCommunity(communityId, await readJsonBody(req));

    return NextResponse.json({ success: true, community });
  });
}
