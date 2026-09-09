import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@prisma/client";
import { notifyCourseApproval } from "@/features/shared/server/notificationTriggers.service";

/**
 * Courses waiting on Admin review, newest first.
 * Approved/Rejected courses are intentionally excluded —
 * this list is only the Admin's action queue.
 */
export async function getCoursesUnderReview() {
  return prisma.course.findMany({
    where: {
      status: CourseStatus.UNDER_REVIEW,
    },

    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCourseByIdForAdmin(courseId: string) {
  return prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });
}

export async function setCourseApproval(
  courseId: string,
  status: typeof CourseStatus.APPROVED | typeof CourseStatus.REJECTED,
) {
  const updated = await prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      status,
    },
  });

  await notifyCourseApproval(courseId, status === CourseStatus.APPROVED);

  return updated;
}
