import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getEnrollmentsForTeacher } from "@/features/shared/server/enrollmentApproval.service";

/**
 * GET
 *
 * Enrollments in this Teacher's review queue — PENDING_TEACHER_APPROVAL
 * (needs action), PENDING_PARENT_RECONFIRMATION (Teacher already
 * revised, waiting on the Parent), and PENDING_ADMIN_APPROVAL
 * (Teacher already approved, forwarded to Admin — shown read-only
 * so the Teacher can see it's moved on).
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const enrollments = await getEnrollmentsForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, enrollments });
  } catch (error) {
    console.error("Teacher enrollments GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch enrollments." },
      { status: 500 },
    );
  }
}
