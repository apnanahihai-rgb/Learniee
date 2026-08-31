import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  createEnrollment,
  getEnrollmentsForParent,
  EnrollmentError,
  type CreateEnrollmentInput,
} from "@/features/parent/server/enrollment.service";

/**
 * GET
 *
 * Lists every enrollment made by the logged-in parent. Not wired
 * into a screen yet (Payments/My Enrollments is still a Section-4
 * "Not Started" item — see 01-PROJECT-STATUS.md) — kept here
 * alongside POST so the read path doesn't need to be built later
 * from scratch.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const enrollments = await getEnrollmentsForParent(parent.parentId);

    return NextResponse.json({ success: true, enrollments });
  } catch (error) {
    console.error("Parent enrollments GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch enrollments." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Creates a cycle-based Enrollment for one of the parent's children
 * in an approved course. Captures only what's knowable right now
 * (cycle length, session count, the system-calculated rate/total/
 * due-date) — payment fields arrive later once Razorpay is wired
 * in, and dual approval (Teacher + Admin) isn't built yet either
 * (06-OPEN-DECISIONS.md #2 is still open) — see
 * enrollment.service.ts for both.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: CreateEnrollmentInput = await req.json();

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.sessionsPerMonth) {
      return NextResponse.json(
        { error: "Pick a sessions-per-month cycle before enrolling." },
        { status: 400 },
      );
    }

    const enrollment = await createEnrollment(parent.parentId, input);

    return NextResponse.json({ success: true, enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof EnrollmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent enrollments POST error:", error);

    return NextResponse.json(
      { error: "Failed to create enrollment." },
      { status: 500 },
    );
  }
}
