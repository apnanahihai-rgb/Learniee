import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import { getApprovedCourses } from "@/features/parent/server/course.service";

type ApprovedCourse = Awaited<ReturnType<typeof getApprovedCourses>>[number];

/**
 * GET
 *
 * Courses visible to Parents. See getApprovedCourses() for why
 * this is restricted to CourseStatus.APPROVED only.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const courses = await getApprovedCourses();

    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course: ApprovedCourse) => ({
        ...course,
        thumbnailUrl: course.thumbnailKey
          ? await createPresignedDownloadUrl(course.thumbnailKey)
          : null,
      })),
    );

    return NextResponse.json({
      success: true,
      courses: coursesWithThumbnails,
    });
  } catch (error) {
    console.error("Parent courses GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses." },
      { status: 500 },
    );
  }
}
