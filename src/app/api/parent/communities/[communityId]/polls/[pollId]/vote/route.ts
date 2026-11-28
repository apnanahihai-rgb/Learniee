import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { votePoll } from "@/features/community/server/communityEngagement.service";

/** POST { optionIds: string[] } — vote (or change the vote) while the poll is open. Members only. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ communityId: string; pollId: string }> },
) {
  return runParentCommunityRoute(req, "Parent community vote error", "Failed to save your vote.", async (parentId) => {
    const { communityId, pollId } = await params;
    const body: unknown = await req.json().catch(() => ({}));
    const optionIds = body && typeof body === "object" ? (body as { optionIds?: unknown }).optionIds : undefined;

    await votePoll(communityId, pollId, parentId, optionIds);

    return NextResponse.json({ success: true });
  });
}
