import { NextResponse } from "next/server";

import { runAdminCommunityRoute, readJsonBody } from "@/features/community/server/adminRoute";
import { createCommunity, listCommunities } from "@/features/community/server/community.service";

/** GET: every community (active and hidden) with file and member counts. */
export async function GET() {
  return runAdminCommunityRoute("Admin communities GET error", "Failed to load communities.", async () => {
    const communities = await listCommunities();

    return NextResponse.json({ success: true, communities });
  });
}

/** POST { title, description, isPaid, price? }: create a community. */
export async function POST(req: Request) {
  return runAdminCommunityRoute("Admin communities POST error", "Failed to create the community.", async (actor) => {
    const community = await createCommunity(await readJsonBody(req), actor);

    return NextResponse.json({ success: true, community }, { status: 201 });
  });
}
