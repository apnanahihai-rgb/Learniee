import { NextResponse } from "next/server";

import { runAdminCommunityRoute, readJsonBody } from "@/features/community/server/adminRoute";
import { addCommunityFile } from "@/features/community/server/community.service";

/**
 * POST { title?, fileKey, fileName, contentType, sizeBytes? }
 * Records a file the browser already uploaded to S3 through
 * /api/upload/presign (folder "community-files").
 */
export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runAdminCommunityRoute("Admin community file POST error", "Failed to add the file.", async (actor) => {
    const { communityId } = await params;
    const file = await addCommunityFile(communityId, await readJsonBody(req), actor);

    return NextResponse.json({ success: true, file }, { status: 201 });
  });
}
