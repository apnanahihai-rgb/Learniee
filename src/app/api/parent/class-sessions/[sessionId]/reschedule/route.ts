import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  proposeReschedule,
  RescheduleRequestError,
} from "@/features/shared/server/rescheduleRequest.service";

/**
 * POST { proposedDate: "YYYY-MM-DD", proposedTime?: "HH:mm", reason?: string }
 *
 * Parent proposes moving one of their child's scheduled classes to
 * a new date/time. Since the Parent is proposing, this needs the
 * Teacher's approval next — see rescheduleRequest.service.ts.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json().catch(() => ({}));

    if (!body?.proposedDate || typeof body.proposedDate !== "string") {
      return NextResponse.json(
        { error: "A proposed date is required." },
        { status: 400 },
      );
    }

    const request = await proposeReschedule({
      sessionId,
      actorRole: "PARENT",
      actorId: parent.parentId,
      proposedDate: body.proposedDate,
      proposedTime: body.proposedTime ?? null,
      reason: body.reason ?? null,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof RescheduleRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent propose reschedule POST error:", error);

    return NextResponse.json(
      { error: "Failed to submit the reschedule request." },
      { status: 500 },
    );
  }
}
