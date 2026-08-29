import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  createStudentForParent,
  getStudentsForParent,
  type StudentFormInput,
} from "@/features/parent/server/student.service";

/**
 * GET
 *
 * List every Student profile belonging to the logged-in parent.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const students = await getStudentsForParent(parent.parentId);

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error("Parent students GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch student profiles." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Add a new Student profile for the logged-in parent. Same field
 * shape as onboarding Step 2 (Child Information) - a parent can
 * call this as many times as they have children to add, there is
 * no limit on how many Student profiles one parent can have.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: StudentFormInput = await req.json();

    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 },
      );
    }

    const student = await createStudentForParent(parent.parentId, input);

    return NextResponse.json(
      { success: true, studentId: student.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Parent students POST error:", error);

    return NextResponse.json(
      { error: "Failed to add student profile." },
      { status: 500 },
    );
  }
}
