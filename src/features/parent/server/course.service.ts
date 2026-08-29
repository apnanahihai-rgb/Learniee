import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@prisma/client";

/**
 * Courses visible to Parents — APPROVED only. A course a teacher
 * has submitted but Admin hasn't approved yet (UNDER_REVIEW), one
 * Admin rejected (REJECTED), or an unpublished draft (DRAFT) must
 * never come back from this query. Do not widen this `where`
 * clause without checking 06-OPEN-DECISIONS.md / 03-DATA-MODEL.md
 * first.
 */
export async function getApprovedCourses() {
  return prisma.course.findMany({
    where: {
      status: CourseStatus.APPROVED,
    },

    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}
