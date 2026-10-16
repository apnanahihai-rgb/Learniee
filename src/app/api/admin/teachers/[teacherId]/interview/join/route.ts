import { NextResponse } from "next/server";

import { getInterviewJoinLink } from "@/features/shared/server/teacherInterviewMeeting.service";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";

/**
 * POST /api/admin/teachers/[teacherId]/interview/join
 *
 * Admin's way into a teacher's interview room. Same join window as the
 * Teacher (10 minutes before onwards, server clock). The Admin who joins is
 * made a co-host so they have real host controls; if Meet can't confirm that
 * the link is still returned with `hostConfirmed: false`.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) return auth.error;

    const { teacherId } = await params;

    let hostEmail = auth.payload.email ?? null;

    if (!hostEmail) {
      const admin = await prisma.admin.findUnique({
        where: { cognitoId: auth.payload.sub },
        select: { email: true },
      });

      hostEmail = admin?.email ?? null;
    }

    const result = await getInterviewJoinLink(teacherId, { hostEmail });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    return NextResponse.json({
      meetingUri: result.meetingUri,
      hostConfirmed: result.hostConfirmed,
    });
  } catch (error) {
    console.error("Admin interview join error:", error);

    return NextResponse.json({ error: "Failed to open the interview room" }, { status: 500 });
  }
}
