import { prisma } from "@/lib/prisma";
import { CourseStatus, TeacherFileType } from "@prisma/client";

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

/**
 * A single course's full detail, for the Parent course-detail page.
 * Same APPROVED-only rule as getApprovedCourses() above — a Parent
 * must never be able to load an UNDER_REVIEW/REJECTED/DRAFT course
 * by guessing its id in the URL. Also pulls the teacher's profile
 * photo + intro video (TeacherFile), so the detail page can show
 * "who's teaching this" without a second round trip.
 */
export async function getApprovedCourseById(courseId: string) {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      status: CourseStatus.APPROVED,
    },

    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
          aboutMe: true,
          city: true,
          country: true,
          files: {
            where: {
              type: {
                in: [TeacherFileType.PROFILE_PHOTO, TeacherFileType.INTRO_VIDEO],
              },
            },
            select: {
              type: true,
              s3Key: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Other APPROVED courses by the same teacher, for the "More from
 * this teacher" section on the course-detail page. Excludes the
 * course currently being viewed. Same APPROVED-only rule as above.
 */
export async function getOtherApprovedCoursesByTeacher(
  teacherId: string,
  excludeCourseId: string,
) {
  return prisma.course.findMany({
    where: {
      teacherId,
      status: CourseStatus.APPROVED,
      NOT: { id: excludeCourseId },
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

    take: 6,
  });
}
