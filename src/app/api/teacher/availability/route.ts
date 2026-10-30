import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  AvailabilityError,
  getTeacherAvailability,
  replaceTeacherAvailability,
} from "@/features/shared/server/teacherAvailability.service";

/** GET — this Teacher's weekly availability (empty list = not set yet). */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const slots = await getTeacherAvailability(teacher.teacherId);

    return NextResponse.json({ success: true, slots, hasAvailability: slots.length > 0 });
  } catch (error) {
    console.error("Teacher availability GET error:", error);
    return NextResponse.json({ error: "Failed to load availability." }, { status: 500 });
  }
}

/** PUT { slots: [{ dayOfWeek, startTime, endTime }] } — replaces the whole week. */
export async function PUT(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const body = await req.json().catch(() => null);
    const slots = await replaceTeacherAvailability(teacher.teacherId, body?.slots);

    return NextResponse.json({ success: true, slots, hasAvailability: true });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher availability PUT error:", error);
    return NextResponse.json({ error: "Failed to save availability." }, { status: 500 });
  }
}
