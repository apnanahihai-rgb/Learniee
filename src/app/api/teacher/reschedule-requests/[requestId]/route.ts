import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  respondToReschedule,
  cancelRescheduleRequest,
  RescheduleRequestError,
} from "@/features/shared/server/rescheduleRequest.service";

/**
 * PATCH { action: "approve" | "reject" | "cancel", responseNote?: string }
 *
 * - "approve"/"reject": this request must currently be
 *   PENDING_TEACHER_APPROVAL (i.e. the Parent proposed it) —
 *   approving moves the underlying ClassSession's date/time.
 * - "cancel": withdraws a request the Teacher themselves proposed,
 *   while it's still pending on the Parent.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "cancel") {
      const request = await cancelRescheduleRequest({
        requestId,
        actorRole: "TEACHER",
        actorId: teacher.teacherId,
      });

      return NextResponse.json({ success: true, request });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve", "reject", or "cancel".' },
        { status: 400 },
      );
    }

    const request = await respondToReschedule({
      requestId,
      actorRole: "TEACHER",
      actorId: teacher.teacherId,
      decision: action === "approve" ? "APPROVE" : "REJECT",
      responseNote: body?.responseNote ?? null,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof RescheduleRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher reschedule-request PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this reschedule request." },
      { status: 500 },
    );
  }
}
