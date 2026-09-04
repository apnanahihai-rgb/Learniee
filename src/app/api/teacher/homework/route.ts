import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import {
  HomeworkError,
  createHomework,
  listHomeworkForTeacherEnrollment,
} from "@/features/shared/server/homework.service";

/**
 * GET ?enrollmentId=<id>
 *
 * Lists homework assigned on this enrollment, newest first —
 * includes each submission (if any) with a short-lived download URL.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
    }

    const homeworks = await listHomeworkForTeacherEnrollment(enrollmentId, teacher.teacherId);

    const withUrls = await Promise.all(
      homeworks.map(async (hw) => ({
        ...hw,
        attachmentUrl: hw.attachmentKey ? await createPresignedDownloadUrl(hw.attachmentKey) : null,
        submission: hw.submission
          ? {
              ...hw.submission,
              fileUrl: await createPresignedDownloadUrl(hw.submission.fileKey),
            }
          : null,
      })),
    );

    return NextResponse.json({ success: true, homeworks: withUrls });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework GET error:", error);

    return NextResponse.json({ error: "Failed to load homework." }, { status: 500 });
  }
}

/**
 * POST { enrollmentId, title, instructions?, attachmentKey?, dueDate? }
 *
 * Assigns new homework on an active enrollment.
 */
export async function POST(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const input = await req.json();

    if (!input.enrollmentId || typeof input.enrollmentId !== "string") {
      return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
    }

    const homework = await createHomework(teacher.teacherId, {
      enrollmentId: input.enrollmentId,
      title: input.title,
      instructions: input.instructions,
      attachmentKey: input.attachmentKey,
      dueDate: input.dueDate,
    });

    return NextResponse.json({ success: true, homework }, { status: 201 });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework POST error:", error);

    return NextResponse.json({ error: "Failed to assign homework." }, { status: 500 });
  }
}
