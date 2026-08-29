import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

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
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 400 },
      );
    }

    const students = await getStudentsForParent(parent.id);

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
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 400 },
      );
    }

    const input: StudentFormInput = await req.json();

    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 },
      );
    }

    const student = await createStudentForParent(parent.id, input);

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
