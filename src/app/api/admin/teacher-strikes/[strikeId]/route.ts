import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import {
  TeacherStrikeError,
  waiveTeacherStrike,
} from "@/features/shared/server/teacherStrike.service";

/**
 * POST { reason } — Admin waives one teacher strike (for example an
 * emergency). `reason` is mandatory. The strike stays on the record
 * but no longer counts. Changes a teacher's record, so it uses the
 * verified Admin check, like the class-review decisions.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ strikeId: string }> },
) {
  try {
    const { strikeId } = await params;

    if (!strikeId) {
      return NextResponse.json({ error: "Strike ID is required." }, { status: 400 });
    }

    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (typeof body?.reason !== "string") {
      return NextResponse.json({ error: "A reason is required." }, { status: 400 });
    }

    const actor = actorFromTokenPayload({
      sub: admin.sub as string,
      email: admin.email as string | undefined,
      given_name: admin.given_name as string | undefined,
      family_name: admin.family_name as string | undefined,
    });

    await waiveTeacherStrike({
      strikeId,
      reason: body.reason,
      admin: { sub: actor.actorId, name: actor.actorName, email: actor.actorEmail },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TeacherStrikeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin teacher-strikes waive POST error:", error);

    return NextResponse.json({ error: "Failed to waive this strike." }, { status: 500 });
  }
}
