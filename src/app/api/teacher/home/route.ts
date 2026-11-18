import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getTeacherHome } from "@/features/teacher/server/home.service";

/**
 * GET — everything the Teacher home screen shows, in one response: today's
 * and the coming classes and demos, the courses with student progress,
 * "needs your attention" items (enrollment reviews, reschedules, homework,
 * certificates), earnings and the finish-setup card. Read-only; every query
 * inside is scoped to the logged-in Teacher.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const home = await getTeacherHome(teacher.teacherId);

    return NextResponse.json({ success: true, home });
  } catch (error) {
    console.error("Teacher home GET error:", error);

    return NextResponse.json(
      { error: "Failed to load your dashboard." },
      { status: 500 },
    );
  }
}
