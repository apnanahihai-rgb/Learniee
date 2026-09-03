import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getTeacherCalendarOccurrences } from "@/features/shared/server/scheduleOccurrences.service";

/**
 * GET ?month=YYYY-MM
 *
 * Every scheduled-class occurrence across all of this Teacher's
 * ACTIVE/LAPSED enrollments (every student), expanded from each
 * Enrollment's recurring `scheduleDays`/`scheduleTime` for the
 * given month (defaults to the current month).
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? undefined;

    const occurrences = await getTeacherCalendarOccurrences(
      teacher.teacherId,
      month,
    );

    return NextResponse.json({ success: true, occurrences });
  } catch (error) {
    console.error("Teacher calendar GET error:", error);

    return NextResponse.json(
      { error: "Failed to load the calendar." },
      { status: 500 },
    );
  }
}
