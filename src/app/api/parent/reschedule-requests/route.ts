import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { listRescheduleRequestsForParent } from "@/features/shared/server/rescheduleRequest.service";

/**
 * GET — every reschedule request involving this Parent: ones
 * awaiting their approval (Teacher-proposed), and ones they've
 * raised themselves (any status), newest first.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) {
      return parent.error;
    }

    const requests = await listRescheduleRequestsForParent(parent.parentId);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Parent reschedule-requests GET error:", error);

    return NextResponse.json(
      { error: "Failed to load reschedule requests." },
      { status: 500 },
    );
  }
}
