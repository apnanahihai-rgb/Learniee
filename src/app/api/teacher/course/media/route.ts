import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

export async function GET(req: NextRequest) {
  try {
    // -----------------------------------------
    // 1. Authenticate teacher
    // -----------------------------------------

    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // -----------------------------------------
    // 2. Get logged-in teacher
    // -----------------------------------------

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
        {
          error: "Teacher not found.",
        },
        { status: 404 },
      );
    }

    // -----------------------------------------
    // 3. Get query parameters
    // -----------------------------------------

    const { searchParams } = new URL(req.url);

    const courseId = searchParams.get("courseId");
    const type = searchParams.get("type");

    if (!courseId) {
      return NextResponse.json(
        {
          error: "courseId is required.",
        },
        { status: 400 },
      );
    }

    if (type !== "thumbnail" && type !== "video") {
      return NextResponse.json(
        {
          error: "type must be thumbnail or video.",
        },
        { status: 400 },
      );
    }

    // -----------------------------------------
    // 4. Find course belonging to this teacher
    // -----------------------------------------

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId: teacher.id,
      },
      select: {
        thumbnailKey: true,
        introVideoKey: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          error: "Course not found.",
        },
        { status: 404 },
      );
    }

    // -----------------------------------------
    // 5. Select requested S3 key
    // -----------------------------------------

    const key =
      type === "thumbnail"
        ? course.thumbnailKey
        : course.introVideoKey;

    if (!key) {
      return NextResponse.json(
        {
          error:
            type === "thumbnail"
              ? "Course thumbnail not found."
              : "Course intro video not found.",
        },
        { status: 404 },
      );
    }

    // -----------------------------------------
    // 6. Generate temporary S3 GET URL
    // -----------------------------------------

    const url = await createPresignedDownloadUrl(
      key,
      900,
    );

    // -----------------------------------------
    // 7. Return URL
    // -----------------------------------------

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error(
      "Course media GET error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to generate media URL.",
      },
      { status: 500 },
    );
  }
}