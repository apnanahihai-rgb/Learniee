import { NextResponse } from "next/server";

import { getInterviewJoinLink } from "@/features/shared/server/teacherInterviewMeeting.service";
import { prisma } from "@/lib/prisma";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

/**
 * POST /api/teacher/interview/join
 *
 * The signed-in Teacher's own interview. Returns the Google Meet link only
 * while the join window is open (10 minutes before the interview onwards,
 * checked on the server clock); before that it answers 409 with the time it
 * opens. Never returns a link for anyone else's interview.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) return auth.error;

    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { id: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const result = await getInterviewJoinLink(teacher.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    return NextResponse.json({ meetingUri: result.meetingUri });
  } catch (error) {
    console.error("Teacher interview join error:", error);

    return NextResponse.json({ error: "Failed to open the interview room" }, { status: 500 });
  }
}
