import { NextResponse } from "next/server";

import { isGoogleMeetEnabled } from "@/lib/googleMeet";

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

    return NextResponse.json({
      success: true,
      bookings,
      // Lets the screen show the join buttons on the SERVER's clock, and
      // say so if video isn't switched on, instead of a dead button.
      serverNow: new Date().toISOString(),
      meetEnabled: isGoogleMeetEnabled(),
    });
  } catch (error) {
    console.error("Teacher demo-bookings GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch demo bookings." },
      { status: 500 },
    );
  }
}
