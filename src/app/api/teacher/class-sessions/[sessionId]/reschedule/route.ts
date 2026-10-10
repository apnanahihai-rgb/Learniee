import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  cancelForLateReschedule,
  proposeReschedule,
  RescheduleRequestError,
} from "@/features/shared/server/rescheduleRequest.service";
import { sessionFlowErrorResponse } from "@/features/shared/server/sessionFlowRoute";

/**
 * POST { proposedDate: "YYYY-MM-DD", proposedTime?: "HH:mm", reason?: string,
 *        confirmLateCancel?: boolean }
 *
 * A class under 4 hours away can't be rescheduled (Phase 2.4): the
 * first call answers 409 with `code: "LATE_TEACHER_RESCHEDULE"`; the
 * same call with `confirmLateCancel: true` cancels the class instead
 * (make-up + strike) and answers `{ success: true, cancelled: true }`.
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

    try {
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
      if (
        error instanceof RescheduleRequestError &&
        error.code === "LATE_TEACHER_RESCHEDULE" &&
        body.confirmLateCancel === true
      ) {
        try {
          const session = await cancelForLateReschedule({
            sessionId,
            teacherId: teacher.teacherId,
            reason: typeof body.reason === "string" ? body.reason : null,
          });

          return NextResponse.json({ success: true, cancelled: true, session });
        } catch (cancelError) {
          if (cancelError instanceof RescheduleRequestError) throw cancelError;

          return sessionFlowErrorResponse(
            cancelError,
            "Teacher late reschedule cancel POST",
            "Failed to cancel this class.",
          );
        }
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof RescheduleRequestError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status },
      );
    }

    console.error("Teacher propose reschedule POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit the reschedule request." },
      { status: 500 },
    );
  }
}
