import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/api-auth";
import {
  adminApproveEnrollment,
  adminRejectEnrollment,
  EnrollmentApprovalError,
} from "@/features/shared/server/enrollmentApproval.service";

/**
 * PATCH
 *
 * body: { action: "APPROVE" } -> enrollment goes ACTIVE, lectures
 *   can be scheduled as agreed.
 * body: { action: "REJECT", reason? } -> terminal REJECTED, per
 *   direct instruction this does NOT bounce back to the Teacher
 *   even though the Teacher already approved it.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const { enrollmentId } = await params;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID is required." },
        { status: 400 },
      );
    }

    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = await req.json();
    const { action } = body;

    let enrollment;

    if (action === "APPROVE") {
      enrollment = await adminApproveEnrollment(enrollmentId);
    } else if (action === "REJECT") {
      enrollment = await adminRejectEnrollment(enrollmentId, body.reason);
    } else {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentApprovalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Admin enrollment approval PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to update this enrollment." },
      { status: 500 },
    );
  }
}
