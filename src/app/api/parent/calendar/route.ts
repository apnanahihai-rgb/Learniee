import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getParentCalendarOccurrences } from "@/features/shared/server/scheduleOccurrences.service";

/**
 * GET ?month=YYYY-MM&studentId=<id>
 *
 * Returns every scheduled-class occurrence for the logged-in
 * Parent's ACTIVE/LAPSED enrollments, expanded from each
 * Enrollment's recurring `scheduleDays`/`scheduleTime` for the
 * given month (defaults to the current month). Omitting `studentId`
 * returns all children's schedules together — each occurrence
 * already carries `studentId`/`studentName` so the client can
 * color-code per child. Passing `studentId` scopes to just that
 * child's profile-page calendar.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? undefined;
    const studentId = url.searchParams.get("studentId") ?? undefined;

    const occurrences = await getParentCalendarOccurrences(
      parent.parentId,
      month,
      studentId,
    );

    return NextResponse.json({ success: true, occurrences });
  } catch (error) {
    console.error("Parent calendar GET error:", error);

    return NextResponse.json(
      { error: "Failed to load the calendar." },
      { status: 500 },
    );
  }
}
