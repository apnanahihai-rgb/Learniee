import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  deleteStudentForParent,
  getStudentById,
} from "@/features/parent/server/student.service";

/**
 * GET
 *
 * Fetch a single Student profile, scoped to the logged-in parent.
 * Returns 404 both when the id doesn't exist and when it belongs
 * to a different parent - never leaks which case it is.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;

    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const student = await getStudentById(parent.parentId, studentId);

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("Parent student GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch student profile." },
      { status: 500 },
    );
  }
}

/**
 * DELETE
 *
 * Removes a Student profile, scoped to the logged-in parent. Does
 * not touch anything else - Enrollment/ClassSession/etc. aren't
 * modeled yet, so there's nothing downstream to cascade to today.
 * Once Enrollment exists, revisit whether deleting a Student should
 * be blocked while an active enrollment exists for them.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;

    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const deleted = await deleteStudentForParent(parent.parentId, studentId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Parent student DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to remove student profile." },
      { status: 500 },
    );
  }
}
