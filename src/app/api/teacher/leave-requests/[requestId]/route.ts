import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  cancelLeaveRequest,
  LeaveRequestError,
} from "@/features/shared/server/leaveRequest.service";

/**
 * PATCH { action: "cancel" }
 *
 * Withdraws a leave request the Teacher raised themselves, while
 * it's still PENDING. Approve/reject is Admin-only, via
 * `/api/admin/leave-requests/[requestId]`.
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

    if (body?.action !== "cancel") {
      return NextResponse.json(
        { error: 'action must be "cancel".' },
        { status: 400 },
      );
    }

    const request = await cancelLeaveRequest({
      requestId,
      teacherId: teacher.teacherId,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof LeaveRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher leave-request PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this leave request." },
      { status: 500 },
    );
  }
}
