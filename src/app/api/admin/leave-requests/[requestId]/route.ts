import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import {
  respondToLeaveRequest,
  LeaveRequestError,
} from "@/features/shared/server/leaveRequest.service";

/**
 * PATCH { action: "APPROVE" | "REJECT", adminNote? }
 *
 * Admin has the only say on a leave request — terminal either way,
 * no bounce-back to the Teacher.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    if (!requestId) {
      return NextResponse.json(
        { error: "Leave request ID is required." },
        { status: 400 },
      );
    }

    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT." },
        { status: 400 },
      );
    }

    const request = await respondToLeaveRequest({
      requestId,
      decision: action,
      adminNote: body?.adminNote,
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    if (error instanceof LeaveRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin leave-request PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this leave request." },
      { status: 500 },
    );
  }
}
