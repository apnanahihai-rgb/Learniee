import { NextResponse } from "next/server";

import { runAdminCommunityRoute } from "@/features/community/server/adminRoute";
import { deleteCommunityFile } from "@/features/community/server/community.service";

/** DELETE: remove a file from a community (and its S3 object). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ communityId: string; fileId: string }> },
) {
  return runAdminCommunityRoute("Admin community file DELETE error", "Failed to delete the file.", async (actor) => {
    const { communityId, fileId } = await params;

    await deleteCommunityFile(communityId, fileId, actor);

    return NextResponse.json({ success: true });
  });
}
