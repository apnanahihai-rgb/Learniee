import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getDemoBookingsForTeacher } from "@/features/shared/server/demoBooking.service";

/**
 * GET
 *
 * Lists every demo booking made with the logged-in teacher. Backs
 * the "Demo" sidebar entry (/teacher/demo), which previously pointed
 * at a page that didn't exist — mirrors GET /api/parent/demo-bookings.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const bookings = await getDemoBookingsForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Teacher demo-bookings GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch demo bookings." },
      { status: 500 },
    );
  }
}
