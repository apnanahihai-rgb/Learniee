import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getTeacherAvailability } from "@/features/shared/server/teacherAvailability.service";

/** GET — a Teacher's weekly availability, so the booking screens only offer real timings. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const { teacherId } = await params;
    const slots = await getTeacherAvailability(teacherId);

    return NextResponse.json({ success: true, slots });
  } catch (error) {
    console.error("Parent teacher availability GET error:", error);
    return NextResponse.json({ error: "Failed to load availability." }, { status: 500 });
  }
}
