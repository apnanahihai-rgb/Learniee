import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { listRescheduleRequestsForTeacher } from "@/features/shared/server/rescheduleRequest.service";

/**
 * GET — every reschedule request involving this Teacher: ones
 * awaiting their approval (Parent-proposed), and ones they've raised
 * themselves (any status), newest first.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) {
      return teacher.error;
    }

    const requests = await listRescheduleRequestsForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Teacher reschedule-requests GET error:", error);

    return NextResponse.json(
      { error: "Failed to load reschedule requests." },
      { status: 500 },
    );
  }
}
