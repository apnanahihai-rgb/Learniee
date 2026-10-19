import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getDemoJoinLink } from "@/features/shared/server/demoMeeting.service";

/**
 * POST /api/parent/demo-bookings/[bookingId]/join
 *
 * The signed-in Parent's own demo. Returns the Google Meet link only while
 * the join window is open (10 minutes before the demo until 30 minutes after
 * it ends, checked on the server clock); before that it answers 409 with the
 * time it opens. Never returns a link for anyone else's demo.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const parent = await requireParentId(req);

    if ("error" in parent) return parent.error;

    const result = await getDemoJoinLink(bookingId, { role: "PARENT", id: parent.parentId });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    return NextResponse.json({ meetingUri: result.meetingUri });
  } catch (error) {
    console.error("Parent demo join error:", error);

    return NextResponse.json({ error: "Failed to open the demo room" }, { status: 500 });
  }
}
