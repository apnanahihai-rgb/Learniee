import { NextResponse } from "next/server";

import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import { getCoursesUnderReview } from "@/features/admin/server/course.service";

type CourseUnderReview = Awaited<ReturnType<typeof getCoursesUnderReview>>[number];

export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // ?type=group → only the group-class queue (Admin "Group classes" page).
    const groupOnly = new URL(req.url).searchParams.get("type") === "group";

    const courses = await getCoursesUnderReview({ groupOnly });

    /*
     * The S3 bucket is private, so the browser cannot load
     * thumbnailKey directly — resolve a short-lived viewUrl
     * per course, same pattern as /api/admin/teachers.
     */
    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course: CourseUnderReview) => ({
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
    console.error("Admin courses GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch courses." },
      { status: 500 },
    );
  }
}
