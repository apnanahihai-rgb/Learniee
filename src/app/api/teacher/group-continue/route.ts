import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { listTeacherContinuePrompts } from "@/features/shared/server/groupContinue.service";

/**
 * GET — the "Continue this group?" questions that are due for the signed-in
 * Teacher (optionally `?courseId=` for one group). Scoped to the Teacher's own
 * groups inside the service.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) return teacher.error;

    const courseId = new URL(req.url).searchParams.get("courseId")?.trim() || undefined;
    const prompts = await listTeacherContinuePrompts(teacher.teacherId, courseId);

    return NextResponse.json({ success: true, prompts });
  } catch (error) {
    console.error("Teacher group-continue GET error:", error);

    return NextResponse.json({ error: "Failed to load the group questions." }, { status: 500 });
  }
}
