import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  HomeworkError,
  reviewSubmission,
} from "@/features/shared/server/homework.service";

/**
 * PATCH { feedback? }
 *
 * Marks the submission on this homework REVIEWED, optionally with a
 * short feedback note. No numeric grading — see model doc-comment
 * in schema.prisma.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  try {
    const { homeworkId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const input = await req.json().catch(() => ({}));

    const submission = await reviewSubmission(teacher.teacherId, homeworkId, {
      feedback: input.feedback,
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework review PATCH error:", error);

    return NextResponse.json({ error: "Failed to review submission." }, { status: 500 });
  }
}
