import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  HomeworkError,
  deleteHomework,
  updateHomework,
} from "@/features/shared/server/homework.service";

/**
 * PATCH { title?, instructions?, attachmentKey?, dueDate? }
 *
 * Edits a homework assignment the requesting Teacher owns.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  try {
    const { homeworkId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const input = await req.json();

    const homework = await updateHomework(teacher.teacherId, homeworkId, {
      title: input.title,
      instructions: input.instructions,
      attachmentKey: input.attachmentKey,
      dueDate: input.dueDate,
    });

    return NextResponse.json({ success: true, homework });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework PATCH error:", error);

    return NextResponse.json({ error: "Failed to update homework." }, { status: 500 });
  }
}

/**
 * DELETE
 *
 * Removes a homework assignment (and its submission, if any) the
 * requesting Teacher owns.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  try {
    const { homeworkId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    await deleteHomework(teacher.teacherId, homeworkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HomeworkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher homework DELETE error:", error);

    return NextResponse.json({ error: "Failed to delete homework." }, { status: 500 });
  }
}
