import { NextResponse } from "next/server";

import { runAdminCommunityRoute, readJsonBody } from "@/features/community/server/adminRoute";
import { closePoll, deletePoll } from "@/features/community/server/communityEngagement.service";
import { CommunityError } from "@/features/community/server/community.service";

/** PATCH { status: "CLOSED" } — close the poll now. Results are kept. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ communityId: string; pollId: string }> },
) {
  return runAdminCommunityRoute("Admin community poll PATCH error", "Failed to close the poll.", async (actor) => {
    const { communityId, pollId } = await params;
    const body = await readJsonBody(req);

    if (body.status !== "CLOSED") {
      throw new CommunityError('Only { "status": "CLOSED" } is supported.');
    }

    await closePoll(communityId, pollId, actor);

    return NextResponse.json({ success: true });
  });
}

/** DELETE — remove the poll with all its votes. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ communityId: string; pollId: string }> },
) {
  return runAdminCommunityRoute("Admin community poll DELETE error", "Failed to delete the poll.", async (actor) => {
    const { communityId, pollId } = await params;

    await deletePoll(communityId, pollId, actor);

    return NextResponse.json({ success: true });
  });
}
