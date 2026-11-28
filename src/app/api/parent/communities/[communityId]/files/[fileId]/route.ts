import { NextResponse } from "next/server";

import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { getCommunityFileLinkForParent } from "@/features/community/server/communityParent.service";

/**
 * GET ?download=1 (omit to open in the browser).
 * Members only. Re-checks membership, then redirects to a fresh short-lived
 * S3 link, so a non-member (or someone who has left) gets nothing.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ communityId: string; fileId: string }> },
) {
  return runParentCommunityRoute(req, "Parent community file error", "Failed to open the file.", async (parentId) => {
    const { communityId, fileId } = await params;
    const download = new URL(req.url).searchParams.get("download") === "1";

    const url = await getCommunityFileLinkForParent(communityId, fileId, parentId, download);

    const response = NextResponse.redirect(url, 302);
    response.headers.set("Cache-Control", "private, no-store");

    return response;
  });
}
