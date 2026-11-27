import { NextResponse } from "next/server";

import { ChatError } from "@/features/chat/server/chat.service";
import { broadcastToGroup } from "@/features/chat/server/groupBroadcast.service";
import { requireTeacherId } from "@/features/teacher/server/auth";

/** POST { body } — announce to every student of this group class. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) return teacher.error;

    const input = await req.json().catch(() => ({}));
    const result = await broadcastToGroup(teacher.teacherId, courseId, String(input?.body ?? ""));

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher group broadcast error:", error);

    return NextResponse.json({ error: "Failed to send the announcement." }, { status: 500 });
  }
}
