import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { displayName } from "@/features/shared/utils/displayName";
import {
  ResourceError,
  listResourcesOverviewForTeacher,
} from "@/features/shared/server/resource.service";

/**
 * GET — every resource this teacher has shared (all courses/students),
 * newest first, each file with a short-lived download URL.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const rows = await listResourcesOverviewForTeacher(teacher.teacherId);

    const resources = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        enrollmentId: r.enrollmentId,
        title: r.title,
        description: r.description,
        type: r.type,
        fileName: r.fileName,
        fileUrl: r.fileKey ? await createPresignedDownloadUrl(r.fileKey) : null,
        externalUrl: r.externalUrl,
        createdAt: r.createdAt.toISOString(),
        studentName: displayName(r.student),
        courseId: r.enrollment.course.id,
        courseTitle: r.enrollment.course.courseTitle,
        subject: r.enrollment.course.subject,
      })),
    );

    return NextResponse.json({ success: true, resources });
  } catch (error) {
    if (error instanceof ResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher resources overview error:", error);

    return NextResponse.json({ error: "Failed to load resources." }, { status: 500 });
  }
}
