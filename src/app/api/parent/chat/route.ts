import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getChatRoomsForParent } from "@/features/chat/server/chat.service";

/**
 * GET
 *
 * Lists every chat room the logged-in parent is party to (one per
 * enrolled course+child+teacher combination), most recently active
 * first.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const rooms = await getChatRoomsForParent(parent.parentId);

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error("Parent chat rooms GET error:", error);

    return NextResponse.json(
      { error: "Failed to load chat rooms." },
      { status: 500 },
    );
  }
}
