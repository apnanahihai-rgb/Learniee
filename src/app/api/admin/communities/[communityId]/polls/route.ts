import { NextResponse } from "next/server";

import { runAdminCommunityRoute, readJsonBody } from "@/features/community/server/adminRoute";
import { createPoll, listPollsForAdmin } from "@/features/community/server/communityEngagement.service";

/** GET: this community's polls with counts and who voted, newest first. */
export async function GET(_req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runAdminCommunityRoute("Admin community polls GET error", "Failed to load polls.", async () => {
    const { communityId } = await params;
    const polls = await listPollsForAdmin(communityId);

    return NextResponse.json({ success: true, polls });
  });
}

/** POST { question, options: string[], allowMultiple, closesAt? (ISO) } — post a poll; members are notified. */
export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runAdminCommunityRoute("Admin community poll POST error", "Failed to create the poll.", async (actor) => {
    const { communityId } = await params;
    const poll = await createPoll(communityId, await readJsonBody(req), actor);

    return NextResponse.json({ success: true, poll }, { status: 201 });
  });
}
