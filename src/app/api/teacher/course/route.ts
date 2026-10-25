import { NextResponse } from "next/server";

import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

import {
  createCourse,
  getTeacherCourses,
  type CourseFormInput,
} from "@/features/courses/server/course.service";
import { getStandardSessionPrice } from "@/features/courses/utils/coursePricing";
import { normalizeCourseChoices } from "@/features/courses/utils/courseInput";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";

import { prisma } from "@/lib/prisma";
import {
  ClassRequestError,
  assertCanListCourseForVacancy,
  attachCourseToVacancy,
} from "@/features/shared/server/classRequest.service";

/**
 * GET
 *
 * Fetch all courses belonging to the logged-in teacher.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      );
    }

    const courses = await getTeacherCourses(teacher.id);

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Teacher courses GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Create a new course for the logged-in teacher.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
        isIITian: true,
        approvalStatus: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      );
    }

    if (teacher.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Your teacher account is not approved.", code: "TEACHER_NOT_APPROVED" },
        { status: 403 },
      );
    }

    const input: CourseFormInput = await req.json();

    // IITian listing requires both: self-declared at onboarding Step 1
    // (`teacher.isIITian`) AND the teacher being Admin-approved
    // ("verified", `approvalStatus === APPROVED`). This is always
    // re-derived from the DB and overrides whatever the client sent —
    // never trust a client-computed price/flag, same principle as
    // priceCourse() in course.service.ts. An unapproved or
    // non-self-declared teacher can never get isIITian:true through,
    // no matter what the request body contains.
    input.isIITian = Boolean(teacher.isIITian) && teacher.approvalStatus === "APPROVED";

    if (!input.courseTitle?.trim()) {
      return NextResponse.json(
        { error: "Course title is required." },
        { status: 400 },
      );
    }

    // Resolve "Other" subject / "Custom" frequency & modules / grade range
    // into the plain stored strings (and reject anything malformed).
    const choices = normalizeCourseChoices(input);

    if (!choices.ok) {
      return NextResponse.json({ error: choices.error }, { status: 400 });
    }

    input.subject = choices.subject;
    input.grade = choices.grade;
    input.frequency = choices.frequency;
    input.modules = choices.modules;

    if (input.certificateEnabled) {
      const threshold = Number(input.certificateSessionThreshold);

      if (!Number.isFinite(threshold) || threshold < 1) {
        return NextResponse.json(
          { error: "Certificate session threshold must be a positive number." },
          { status: 400 },
        );
      }
    }

    // Listing for an accepted class-request vacancy: check the Teacher
    // really accepted it (and hasn't listed one yet) before creating.
    const classRequestId =
      typeof input.classRequestId === "string" && input.classRequestId
        ? input.classRequestId
        : null;

    if (classRequestId) {
      const vacancy = await assertCanListCourseForVacancy(teacher.id, classRequestId);

      // The parent was quoted the grade's fixed hourly rate, so the listing
      // uses exactly that, scaled by the lecture duration — never what the
      // client sent, and never the IITian rate.
      if (vacancy.pricePerSession != null) {
        input.grade = vacancy.grade ?? input.grade;
        input.isIITian = false;
        input.price = String(
          getStandardSessionPrice(input.grade, false, sessionLengthForCourse(input.duration)),
        );
      }
    }

    // Teachers set their own price (no fixed grade/IITian rates). A vacancy
    // listing has already been given the request's fixed price above.
    const price = Number(input.price);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Enter a price per session greater than 0." },
        { status: 400 },
      );
    }

    const course = await createCourse(
      teacher.id,
      input,
    );

    if (classRequestId) {
      await attachCourseToVacancy(teacher.id, classRequestId, course.id);
    }

    return NextResponse.json(
      {
        success: true,
        course,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ClassRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher course POST error:", error);

    return NextResponse.json(
      { error: "Failed to create course." },
      { status: 500 },
    );
  }
}