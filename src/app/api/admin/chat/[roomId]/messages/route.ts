import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import {
  ChatError,
  getRoomForAccess,
  listMessages,
} from "@/features/chat/server/chat.service";

/**
 * GET
 *
 * Admin's view into any room's full message history. Deliberately
 * GET-only — no POST here. Admin can *view* any conversation (that's
 * the ask: "manageable" oversight), but shouldn't be able to send
 * messages impersonating a parent or teacher inside their thread.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const admin = requireAdminAuth(req);

    if ("error" in admin) {
      return admin.error;
    }

    await getRoomForAccess(roomId, { role: "ADMIN" });

    const messages = await listMessages(roomId);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin chat messages GET error:", error);

    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 },
    );
  }
}
