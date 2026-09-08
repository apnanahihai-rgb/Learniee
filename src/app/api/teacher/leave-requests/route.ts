import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  createLeaveRequest,
  listLeaveRequestsForTeacher,
  LeaveRequestError,
} from "@/features/shared/server/leaveRequest.service";

/** GET — every leave request this Teacher has raised, newest first. */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const requests = await listLeaveRequestsForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Teacher leave-requests GET error:", error);

    return NextResponse.json(
      { error: "Failed to load leave requests." },
      { status: 500 },
    );
  }
}

/**
 * POST { startDate, endDate, reason }
 *
 * Raises a new leave request — PENDING until Admin approves or
 * rejects it (`/admin/leave-requests`).
 */
export async function POST(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json().catch(() => ({}));

    const request = await createLeaveRequest({
      teacherId: teacher.teacherId,
      startDate: body?.startDate,
      endDate: body?.endDate,
      reason: body?.reason,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof LeaveRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher leave-requests POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit leave request." },
      { status: 500 },
    );
  }
}
