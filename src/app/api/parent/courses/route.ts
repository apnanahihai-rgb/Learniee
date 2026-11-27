import { NextResponse } from "next/server";

import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { createPresignedDownloadUrl } from "@/lib/s3";

import { getApprovedCourses } from "@/features/parent/server/course.service";
import { SEAT_HOLDING_STATUSES } from "@/features/parent/server/enrollment/group";
import { ageFitsGroup, isGroupType, studentAgeYears } from "@/features/courses/utils/groupClass";
import { prisma } from "@/lib/prisma";
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

    const approved = await getApprovedCourses();

    // Group classes: only those whose age range fits at least one of this
    // parent's children (when the children's ages are known), plus how many
    // seats are taken so the card can say "Full".
    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
      select: { students: { select: { age: true, dateOfBirth: true } } },
    });
    const childAges = (parent?.students ?? [])
      .map((s) => studentAgeYears(s))
      .filter((a): a is number => a !== null);

    const groupIds = approved.filter((c) => isGroupType(c.type)).map((c) => c.id);
    const seatRows = groupIds.length
      ? await prisma.enrollment.groupBy({
          by: ["courseId"],
          where: { courseId: { in: groupIds }, status: { in: SEAT_HOLDING_STATUSES } },
          _count: { _all: true },
        })
      : [];
    const seats = new Map(seatRows.map((r) => [r.courseId, r._count._all]));

    const courses = approved
      .filter(
        (c) =>
          !isGroupType(c.type) ||
          childAges.length === 0 ||
          childAges.some((age) => ageFitsGroup(age, c.groupAgeMin, c.groupAgeMax)),
      )
      .map((c) => (isGroupType(c.type) ? { ...c, groupSeatsTaken: seats.get(c.id) ?? 0 } : c));

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

