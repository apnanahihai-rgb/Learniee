import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  proposeReschedule,
  RescheduleRequestError,
} from "@/features/shared/server/rescheduleRequest.service";

/**
 * POST { proposedDate: "YYYY-MM-DD", proposedTime?: "HH:mm", reason?: string }
 *
 * Teacher proposes moving one of their own scheduled classes to a
 * new date/time. Since the Teacher is proposing, this needs the
 * Parent's approval next — see rescheduleRequest.service.ts.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json().catch(() => ({}));

    if (!body?.proposedDate || typeof body.proposedDate !== "string") {
      return NextResponse.json(
        { error: "A proposed date is required." },
        { status: 400 },
      );
    }

    const request = await proposeReschedule({
      sessionId,
      actorRole: "TEACHER",
      actorId: teacher.teacherId,
      proposedDate: body.proposedDate,
      proposedTime: body.proposedTime ?? null,
      reason: body.reason ?? null,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof RescheduleRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher propose reschedule POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit the reschedule request." },
      { status: 500 },
    );
  }
}
