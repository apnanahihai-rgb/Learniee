import { NextResponse } from "next/server";

import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import { getApprovedCourses } from "@/features/parent/server/course.service";
import { getTeacherRatingsByIds } from "@/features/shared/server/review.service";

type ApprovedCourse = Awaited<ReturnType<typeof getApprovedCourses>>[number];

/**
 * GET
 *
 * Courses visible to Parents. See getApprovedCourses() for why
 * this is restricted to CourseStatus.APPROVED only.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "parent");

    if ("error" in auth) {
      return auth.error;
    }

    const courses = await getApprovedCourses();

    // Rating shown per course is the teacher's own overall average
    // (across every review they've received, any course) — never the
    // deprecated Course.rating column. One batched query for every
    // teacher on the page instead of one per course.
    const ratings = await getTeacherRatingsByIds(
      Array.from(new Set(courses.map((course: ApprovedCourse) => course.teacherId))),
    );

    // One presigned photo URL per teacher (not per course). The raw S3
    // key and the professional-info row never go to the browser — only
    // the short summary fields the Teachers tab shows.
    const photoUrls = new Map<string, string | null>();
    for (const course of courses as ApprovedCourse[]) {
      if (photoUrls.has(course.teacherId)) continue;
      const key = course.teacher.files[0]?.s3Key;
      photoUrls.set(
        course.teacherId,
        key ? await createPresignedDownloadUrl(key).catch(() => null) : null,
      );
    }

    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course: ApprovedCourse) => {
        const rating = ratings.get(course.teacherId);
        const { files: _files, professionalInfo, ...teacherFields } = course.teacher;
        void _files;

        return {
          ...course,
          teacher: {
            ...teacherFields,
            photoUrl: photoUrls.get(course.teacherId) ?? null,
            qualifications: professionalInfo?.qualifications ?? null,
            experience: professionalInfo?.overallExperience ?? null,
            averageRating: rating?.averageRating ?? null,
            reviewCount: rating?.totalReviews ?? 0,
          },
          thumbnailUrl: course.thumbnailKey
            ? await createPresignedDownloadUrl(course.thumbnailKey)
            : null,
        };
      }),
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

