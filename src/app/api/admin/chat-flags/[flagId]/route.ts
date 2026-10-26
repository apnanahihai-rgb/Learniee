import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { ChatError } from "@/features/chat/server/chat.service";
import { markChatSafetyFlagReviewed } from "@/features/chat/server/chatSafety.service";

/** PATCH — Admin marks an automatically flagged chat message as reviewed. */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ flagId: string }> },
) {
  try {
    const { flagId } = await params;
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markChatSafetyFlagReviewed(flagId, String(admin.sub));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin chat-flags PATCH error:", error);

    return NextResponse.json({ error: "Failed to update the flag." }, { status: 500 });
  }
}
