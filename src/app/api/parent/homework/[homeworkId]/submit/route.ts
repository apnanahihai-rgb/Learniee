import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  HomeworkError,
  submitHomework,
} from "@/features/shared/server/homework.service";

/**
 * POST { fileKey, note? }
 *
 * Submits (or resubmits — this is an upsert) the Parent's work for
 * one homework row, on behalf of the enrolled Student. `fileKey`
 * comes from a prior /api/upload/presign (folder "homework") + a
 * direct browser-to-S3 PUT, same pattern as every other upload in
 * this app.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  try {
    const { homeworkId } = await params;
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input = await req.json();

    if (!input.fileKey || typeof input.fileKey !== "string") {
      return NextResponse.json({ error: "fileKey is required." }, { status: 400 });
    }

    const submission = await submitHomework(parent.parentId, homeworkId, {
      fileKey: input.fileKey,
      note: input.note,
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent homework submit POST error:", error);

    return NextResponse.json({ error: "Failed to submit homework." }, { status: 500 });
  }
}
