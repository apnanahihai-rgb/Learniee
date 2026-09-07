import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  respondToReschedule,
  cancelRescheduleRequest,
  RescheduleRequestError,
} from "@/features/shared/server/rescheduleRequest.service";

/**
 * PATCH { action: "approve" | "reject" | "cancel", responseNote?: string }
 *
 * - "approve"/"reject": this request must currently be
 *   PENDING_PARENT_APPROVAL (i.e. the Teacher proposed it) —
 *   approving moves the underlying ClassSession's date/time.
 * - "cancel": withdraws a request the Parent themselves proposed,
 *   while it's still pending on the Teacher.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "cancel") {
      const request = await cancelRescheduleRequest({
        requestId,
        actorRole: "PARENT",
        actorId: parent.parentId,
      });

      return NextResponse.json({ success: true, request });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve", "reject", or "cancel".' },
        { status: 400 },
      );
    }

    const request = await respondToReschedule({
      requestId,
      actorRole: "PARENT",
      actorId: parent.parentId,
      decision: action === "approve" ? "APPROVE" : "REJECT",
      responseNote: body?.responseNote ?? null,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof RescheduleRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent reschedule-request PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this reschedule request." },
      { status: 500 },
    );
  }
}
