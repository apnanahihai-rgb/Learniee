import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listChatReports } from "@/features/chat/server/chatReport.service";
import { listChatSafetyFlags } from "@/features/chat/server/chatSafety.service";

/**
 * GET — Admin's queue of reported chat messages (open first) and of
 * automatically flagged ones (blocked / suspicious), plus open counts. Signature-verified (`requireAdmin`).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [listing, flagListing] = await Promise.all([listChatReports(), listChatSafetyFlags()]);

    return NextResponse.json({ success: true, ...listing, ...flagListing });
  } catch (error) {
    console.error("Admin chat-reports GET error:", error);

    return NextResponse.json({ error: "Failed to load reported messages." }, { status: 500 });
  }
}
