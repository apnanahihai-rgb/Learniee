import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { displayName } from "@/features/shared/utils/displayName";
import {
  HomeworkError,
  listHomeworkOverviewForTeacher,
} from "@/features/shared/server/homework.service";

/**
 * GET — every homework this teacher has assigned (all courses/students),
 * newest first. Each row carries its course, student and — if the parent has
 * submitted — the submission with a short-lived download URL.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const rows = await listHomeworkOverviewForTeacher(teacher.teacherId);

    const homeworks = await Promise.all(
      rows.map(async (hw) => ({
        id: hw.id,
        enrollmentId: hw.enrollmentId,
        title: hw.title,
        instructions: hw.instructions,
        attachmentUrl: hw.attachmentKey ? await createPresignedDownloadUrl(hw.attachmentKey) : null,
        dueDate: hw.dueDate ? hw.dueDate.toISOString() : null,
        createdAt: hw.createdAt.toISOString(),
        studentName: displayName(hw.student),
        courseId: hw.enrollment.course.id,
        courseTitle: hw.enrollment.course.courseTitle,
        subject: hw.enrollment.course.subject,
        submission: hw.submission
          ? {
              id: hw.submission.id,
              status: hw.submission.status,
              note: hw.submission.note,
              feedback: hw.submission.feedback,
              submittedAt: hw.submission.submittedAt.toISOString(),
              reviewedAt: hw.submission.reviewedAt ? hw.submission.reviewedAt.toISOString() : null,
              fileUrl: await createPresignedDownloadUrl(hw.submission.fileKey),
            }
          : null,
      })),
    );

    return NextResponse.json({ success: true, homeworks });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework overview error:", error);

    return NextResponse.json({ error: "Failed to load homework." }, { status: 500 });
  }
}
