import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { getChatRoomsForTeacher } from "@/features/chat/server/chat.service";

/**
 * GET
 *
 * Lists every chat room the logged-in teacher is party to — one per
 * enrolled child (each room maps 1:1 to an Enrollment), most
 * recently active first.
 */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const rooms = await getChatRoomsForTeacher(teacher.teacherId);

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error("Teacher chat rooms GET error:", error);

    return NextResponse.json(
      { error: "Failed to load chat rooms." },
      { status: 500 },
    );
  }
}
