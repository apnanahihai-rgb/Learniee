import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  markClassSessionComplete,
  ClassSessionError,
} from "@/features/shared/server/classSession.service";

/**
 * PATCH
 *
 * Marks one specific, real `ClassSession` complete — the
 * pick-a-specific-date counterpart to the existing one-click "Mark
 * session complete" button (`PATCH
 * /api/teacher/enrollments/[id]/mark-session`, which now marks the
 * earliest due SCHEDULED session instead of blindly incrementing a
 * counter). No request body needed.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const enrollment = await markClassSessionComplete(
      sessionId,
      teacher.teacherId,
    );

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof ClassSessionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Mark class session complete PATCH error:", error);

    return NextResponse.json(
      { error: "Failed to mark this session complete." },
      { status: 500 },
    );
  }
}
