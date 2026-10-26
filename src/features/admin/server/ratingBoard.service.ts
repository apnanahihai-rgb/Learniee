import "server-only";

import { EnrollmentStatus, LedgerPayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { rankByRating } from "@/features/admin/utils/ratingRank";

/** Enrollments that are still in progress: deleting under them would hurt a parent who paid. */
export const LIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "PENDING_TEACHER_APPROVAL",
  "PENDING_PARENT_RECONFIRMATION",
  "PENDING_ADMIN_APPROVAL",
];

/** Payout rows that are not finished yet: deleting would erase money still owed. */
export const OPEN_LEDGER_STATUSES: LedgerPayoutStatus[] = [
  "PENDING_VERIFICATION",
  "ON_HOLD",
  "QUEUED_FOR_PAYMENT",
  "PROCESSING",
];

export interface RatingBoardCourse {
  id: string;
  title: string;
  subject: string | null;
  status: string;
  teacherId: string;
  teacherName: string;
  averageRating: number | null;
  totalReviews: number;
  rank: number | null;
  flagged: boolean;
  liveEnrollments: number;
  openPayouts: number;
}

export interface RatingBoardTeacher {
  id: string;
  name: string;
  email: string;
  approvalStatus: string;
  courseCount: number;
  averageRating: number | null;
  totalReviews: number;
  rank: number | null;
  flagged: boolean;
  liveEnrollments: number;
  openPayouts: number;
}

/**
 * Every course and teacher with their review average and rank, lowest first
 * (unranked / unreviewed last). Teacher rating = average over all their
 * course reviews, the same rule as `getTeacherRatingSummary`.
 */
export async function getRatingBoard() {
  const [courses, teachers, courseRatings, teacherRatings, liveByCourse, liveByTeacher, openByCourse, openByTeacher] =
    await Promise.all([
      prisma.course.findMany({
        select: {
          id: true,
          courseTitle: true,
          subject: true,
          status: true,
          teacherId: true,
          teacher: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          approvalStatus: true,
          _count: { select: { courses: true } },
        },
      }),
      prisma.review.groupBy({ by: ["courseId"], _avg: { rating: true }, _count: { rating: true } }),
      prisma.review.groupBy({ by: ["teacherId"], _avg: { rating: true }, _count: { rating: true } }),
      prisma.enrollment.groupBy({
        by: ["courseId"],
        where: { status: { in: LIVE_ENROLLMENT_STATUSES } },
        _count: { _all: true },
      }),
      prisma.enrollment.groupBy({
        by: ["teacherId"],
        where: { status: { in: LIVE_ENROLLMENT_STATUSES } },
        _count: { _all: true },
      }),
      prisma.tuitionLedgerEntry.groupBy({
        by: ["courseId"],
        where: { payoutStatus: { in: OPEN_LEDGER_STATUSES } },
        _count: { _all: true },
      }),
      prisma.tuitionLedgerEntry.groupBy({
        by: ["teacherId"],
        where: { payoutStatus: { in: OPEN_LEDGER_STATUSES } },
        _count: { _all: true },
      }),
    ]);

  const courseStats = new Map(courseRatings.map((r) => [r.courseId, r]));
  const teacherStats = new Map(teacherRatings.map((r) => [r.teacherId, r]));
  const liveCourse = new Map(liveByCourse.map((r) => [r.courseId, r._count._all]));
  const liveTeacher = new Map(liveByTeacher.map((r) => [r.teacherId, r._count._all]));
  const openCourse = new Map(openByCourse.map((r) => [r.courseId, r._count._all]));
  const openTeacher = new Map(openByTeacher.map((r) => [r.teacherId, r._count._all]));

  const courseRanks = rankByRating(
    courses.map((c) => ({
      id: c.id,
      averageRating: courseStats.get(c.id)?._avg.rating ?? null,
      totalReviews: courseStats.get(c.id)?._count.rating ?? 0,
    })),
  );
  const teacherRanks = rankByRating(
    teachers.map((t) => ({
      id: t.id,
      averageRating: teacherStats.get(t.id)?._avg.rating ?? null,
      totalReviews: teacherStats.get(t.id)?._count.rating ?? 0,
    })),
  );

  // Ranked first (lowest rank number), then rated-but-unranked, then unreviewed.
  const order = (a: { rank: number | null; averageRating: number | null }, b: typeof a) =>
    (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
    (a.averageRating ?? Infinity) - (b.averageRating ?? Infinity);

  const courseRows: RatingBoardCourse[] = courses
    .map((c) => {
      const stat = courseStats.get(c.id);
      const rank = courseRanks.get(c.id)!;

      return {
        id: c.id,
        title: c.courseTitle?.trim() || "Untitled course",
        subject: c.subject,
        status: c.status,
        teacherId: c.teacherId,
        teacherName: `${c.teacher.firstName} ${c.teacher.lastName}`.trim(),
        averageRating: stat?._avg.rating ?? null,
        totalReviews: stat?._count.rating ?? 0,
        rank: rank.rank,
        flagged: rank.flagged,
        liveEnrollments: liveCourse.get(c.id) ?? 0,
        openPayouts: openCourse.get(c.id) ?? 0,
      };
    })
    .sort(order);

  const teacherRows: RatingBoardTeacher[] = teachers
    .map((t) => {
      const stat = teacherStats.get(t.id);
      const rank = teacherRanks.get(t.id)!;

      return {
        id: t.id,
        name: `${t.firstName} ${t.lastName}`.trim(),
        email: t.email,
        approvalStatus: t.approvalStatus,
        courseCount: t._count.courses,
        averageRating: stat?._avg.rating ?? null,
        totalReviews: stat?._count.rating ?? 0,
        rank: rank.rank,
        flagged: rank.flagged,
        liveEnrollments: liveTeacher.get(t.id) ?? 0,
        openPayouts: openTeacher.get(t.id) ?? 0,
      };
    })
    .sort(order);

  return {
    courses: courseRows,
    teachers: teacherRows,
    rankedCourseCount: courseRows.filter((c) => c.rank !== null).length,
    rankedTeacherCount: teacherRows.filter((t) => t.rank !== null).length,
  };
}
