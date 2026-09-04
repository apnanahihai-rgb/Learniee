import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { createPresignedDownloadUrl } from "@/lib/s3";
import {
  HomeworkError,
  listHomeworkForParentEnrollment,
} from "@/features/shared/server/homework.service";

/**
 * GET ?enrollmentId=<id>
 *
 * Lists homework assigned on this enrollment, newest first —
 * includes the Parent's own submission (if any) with a short-lived
 * download URL for both the teacher's attachment and the submitted
 * file.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
    }

    const homeworks = await listHomeworkForParentEnrollment(enrollmentId, parent.parentId);

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

    console.error("Parent homework GET error:", error);

    return NextResponse.json({ error: "Failed to load homework." }, { status: 500 });
  }
}
