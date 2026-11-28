import { NextResponse } from "next/server";

import { isGroupContinueAction } from "@/features/courses/utils/groupContinue";
import {
  answerGroupContinuation,
  GroupContinueError,
} from "@/features/shared/server/groupContinue.service";
import { requireTeacherId } from "@/features/teacher/server/auth";

/**
 * POST { action: "CONTINUE" | "CLOSE" | "LATER", maxStudents? } — the Teacher's
 * answer to "continue this recurring group?". `maxStudents` is only read for
 * CONTINUE. Ownership and state are checked inside the service.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ continuationId: string }> },
) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) return teacher.error;

    const { continuationId } = await params;
    const input = await req.json().catch(() => ({}));

    if (!isGroupContinueAction(input?.action)) {
      return NextResponse.json(
        { error: "Choose Continue, Close or Remind me later." },
        { status: 400 },
      );
    }

    const result = await answerGroupContinuation({
      teacherId: teacher.teacherId,
      continuationId,
      action: input.action,
      maxStudents: input.maxStudents,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof GroupContinueError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher group-continue POST error:", error);

    return NextResponse.json({ error: "Failed to save your answer." }, { status: 500 });
  }
}
