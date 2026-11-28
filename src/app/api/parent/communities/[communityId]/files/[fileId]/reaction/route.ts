import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { setFileReaction } from "@/features/community/server/communityEngagement.service";

/**
 * PUT { type } — react to a file with one of the allowed emojis (replaces the
 * Parent's earlier reaction). PUT { type: null } removes it. Members only.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ communityId: string; fileId: string }> },
) {
  return runParentCommunityRoute(req, "Parent community reaction error", "Failed to save your reaction.", async (parentId) => {
    const { communityId, fileId } = await params;
    const body: unknown = await req.json().catch(() => ({}));
    const type = body && typeof body === "object" && "type" in body ? (body as { type: unknown }).type : undefined;

    await setFileReaction(communityId, fileId, parentId, type === undefined ? "" : type);

    return NextResponse.json({ success: true });
  });
}
