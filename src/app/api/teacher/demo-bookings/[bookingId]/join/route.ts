import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getDemoJoinLink } from "@/features/shared/server/demoMeeting.service";

/**
 * POST /api/teacher/demo-bookings/[bookingId]/join
 *
 * The signed-in Teacher's own demo. Same window rule as the Parent's route.
 * The Teacher is made a co-host of the room; `hostConfirmed: false` is a
 * warning for the screen, not a reason to withhold the link.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) return teacher.error;

    const result = await getDemoJoinLink(bookingId, { role: "TEACHER", id: teacher.teacherId });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    return NextResponse.json({
      meetingUri: result.meetingUri,
      hostConfirmed: result.hostConfirmed,
    });
  } catch (error) {
    console.error("Teacher demo join error:", error);

    return NextResponse.json({ error: "Failed to open the demo room" }, { status: 500 });
  }
}
