import { NextResponse } from "next/server";

import { ChatError } from "@/features/chat/server/chat.service";
import { getTeacherGroupOverview } from "@/features/chat/server/groupBroadcast.service";
import { requireTeacherId } from "@/features/teacher/server/auth";

/** GET — students, recent announcements and title of one of the Teacher's group classes. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) return teacher.error;

    const overview = await getTeacherGroupOverview(teacher.teacherId, courseId);

    return NextResponse.json({ success: true, ...overview });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher group overview GET error:", error);

    return NextResponse.json({ error: "Failed to load the group class." }, { status: 500 });
  }
}
