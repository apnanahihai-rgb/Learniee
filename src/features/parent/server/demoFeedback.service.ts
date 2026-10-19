import { getDemoCouponBalance } from "@/features/parent/server/demoCoupon/shared";
import {
  deriveDemoSurveyOutcome,
  isDemoFit,
  isDemoIntent,
  isDemoRating,
  isDemoReason,
  surveyNeedsReason,
  type DemoReasonValue,
  type DemoSurveyOutcomeValue,
} from "@/features/shared/utils/demoSurvey";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { prisma } from "@/lib/prisma";
import { CourseStatus, DemoBookingStatus, Prisma } from "@prisma/client";
import "server-only";

/**
 * Post-demo survey (Parent journey, Oct 2026).
 *
 * A demo has no "ended" event of its own (`DemoBookingStatus.COMPLETED`
 * has no writer), so "the demo is over" is derived the same way
 * everywhere: `scheduledAt` + the course's session length. One survey
 * per booking (`DemoFeedback.demoBookingId` is unique); the Parent
 * answers once and the answer is final.
 */

export class DemoFeedbackError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Surveys older than this stop being offered (they stay answerable by link). */
export const SURVEY_WINDOW_DAYS = 30;
const SIMILAR_COURSE_LIMIT = 3;

/** Wall-clock end of a demo: start + the course's session length. */
export function demoEndsAt(scheduledAt: Date, courseDuration: string | null): Date {
  return new Date(scheduledAt.getTime() + sessionLengthForCourse(courseDuration) * 60_000);
}

const bookingSelect = {
  id: true,
  parentId: true,
  studentId: true,
  teacherId: true,
  courseId: true,
  subject: true,
  status: true,
  scheduledAt: true,
  surveyOpenedAt: true,
  student: { select: { id: true, firstName: true, visibleName: true } },
  teacher: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
  course: { select: { id: true, courseTitle: true, duration: true, subject: true, grade: true } },
  feedback: { select: { id: true, outcome: true, reason: true, createdAt: true } },
} satisfies Prisma.DemoBookingSelect;

type SurveyBooking = Prisma.DemoBookingGetPayload<{ select: typeof bookingSelect }>;

function isEnded(booking: SurveyBooking, now: Date): boolean {
  return (
    !!booking.scheduledAt &&
    demoEndsAt(booking.scheduledAt, booking.course.duration).getTime() <= now.getTime()
  );
}

async function loadOwnedBooking(parentId: string, bookingId: string) {
  const booking = await prisma.demoBooking.findFirst({
    where: { id: bookingId, parentId },
    select: bookingSelect,
  });

  if (!booking) {
    throw new DemoFeedbackError("Demo not found.", 404);
  }

  return booking;
}

/**
 * What the survey page needs. Also stamps `surveyOpenedAt` the first
 * time the page is opened — the dashboard uses that stamp to redirect
 * to an unopened survey at most once.
 */
export async function getDemoSurvey(parentId: string, bookingId: string, now: Date = new Date()) {
  const booking = await loadOwnedBooking(parentId, bookingId);

  if (!booking.surveyOpenedAt) {
    await prisma.demoBooking.updateMany({
      where: { id: booking.id, surveyOpenedAt: null },
      data: { surveyOpenedAt: now },
    });
  }

  return {
    booking: {
      id: booking.id,
      scheduledAt: booking.scheduledAt,
      subject: booking.subject,
      student: booking.student,
      teacher: booking.teacher,
      course: { id: booking.course.id, courseTitle: booking.course.courseTitle },
    },
    ended: isEnded(booking, now),
    submitted: !!booking.feedback,
    outcome: booking.feedback?.outcome ?? null,
  };
}

export interface SubmitDemoFeedbackInput {
  overall?: unknown;
  levelFit?: unknown;
  intent?: unknown;
  reason?: unknown;
}

export interface SimilarCourse {
  id: string;
  courseTitle: string | null;
  subject: string | null;
  grade: string | null;
  price: number | null;
  teacherName: string;
}

export interface DemoFeedbackRouting {
  outcome: DemoSurveyOutcomeValue;
  /** POSITIVE: pre-filled Enroll page (course + child; plan is chosen there). */
  enrollHref: string | null;
  /** NEGATIVE: up to 3 other courses / teachers. */
  similarCourses: SimilarCourse[];
  /** NEGATIVE: how many free demos are left for "try another teacher". */
  remainingFreeDemos: number;
  /** NEGATIVE with a tech issue: offer a one-tap complaint. */
  offerComplaint: boolean;
}

export function buildEnrollHref(courseId: string, studentId: string): string {
  const qs = new URLSearchParams({ mode: "enroll", studentId, from: "demo-survey" });
  return `/parent/courses/${courseId}?${qs.toString()}`;
}

async function findSimilarCourses(booking: SurveyBooking): Promise<SimilarCourse[]> {
  const base = {
    status: CourseStatus.APPROVED,
    id: { not: booking.courseId },
    teacherId: { not: booking.teacherId },
  };
  const select = {
    id: true,
    courseTitle: true,
    subject: true,
    grade: true,
    price: true,
    teacher: { select: { firstName: true, lastName: true, visibleName: true } },
  } satisfies Prisma.CourseSelect;

  const picked = new Map<string, Prisma.CourseGetPayload<{ select: typeof select }>>();

  const subject = booking.course.subject?.trim();
  if (subject) {
    const sameSubject = await prisma.course.findMany({
      where: { ...base, subject: { equals: subject, mode: "insensitive" } },
      select,
      orderBy: { createdAt: "desc" },
      take: SIMILAR_COURSE_LIMIT,
    });
    sameSubject.forEach((c) => picked.set(c.id, c));
  }

  const grade = booking.course.grade?.trim();
  if (picked.size < SIMILAR_COURSE_LIMIT && grade) {
    const sameGrade = await prisma.course.findMany({
      where: { ...base, grade: { equals: grade, mode: "insensitive" }, id: { notIn: [booking.courseId, ...picked.keys()] } },
      select,
      orderBy: { createdAt: "desc" },
      take: SIMILAR_COURSE_LIMIT - picked.size,
    });
    sameGrade.forEach((c) => picked.set(c.id, c));
  }

  return [...picked.values()].slice(0, SIMILAR_COURSE_LIMIT).map((c) => ({
    id: c.id,
    courseTitle: c.courseTitle,
    subject: c.subject,
    grade: c.grade,
    price: c.price === null ? null : Number(c.price),
    teacherName:
      c.teacher.visibleName || `${c.teacher.firstName} ${c.teacher.lastName}`.trim(),
  }));
}

/** Writes the survey (once) and returns where the Parent goes next. */
export async function submitDemoFeedback(
  parentId: string,
  bookingId: string,
  input: SubmitDemoFeedbackInput,
  now: Date = new Date(),
): Promise<DemoFeedbackRouting> {
  const { overall, levelFit, intent } = input;

  if (!isDemoRating(overall) || !isDemoFit(levelFit) || !isDemoIntent(intent)) {
    throw new DemoFeedbackError("Please answer all three questions.", 400);
  }

  // The reason chip is optional, and only kept when the survey asked for it.
  let reason: DemoReasonValue | null = null;
  if (input.reason !== undefined && input.reason !== null && input.reason !== "") {
    if (!isDemoReason(input.reason)) {
      throw new DemoFeedbackError("Unknown reason.", 400);
    }
    reason = surveyNeedsReason(overall, intent) ? input.reason : null;
  }

  const booking = await loadOwnedBooking(parentId, bookingId);

  if (booking.status === DemoBookingStatus.CANCELLED || booking.status === DemoBookingStatus.PENDING_PAYMENT) {
    throw new DemoFeedbackError("This demo can't be reviewed.", 409);
  }
  if (!isEnded(booking, now)) {
    throw new DemoFeedbackError("The survey opens once the demo has ended.", 409);
  }
  if (booking.feedback) {
    throw new DemoFeedbackError("You've already answered this survey.", 409);
  }

  const outcome = deriveDemoSurveyOutcome(overall, intent);

  try {
    await prisma.demoFeedback.create({
      data: {
        demoBookingId: booking.id,
        parentId,
        studentId: booking.studentId,
        teacherId: booking.teacherId,
        courseId: booking.courseId,
        overall,
        levelFit,
        intent,
        reason,
        outcome,
      },
    });
  } catch (err) {
    // Two taps / two tabs: the unique index on demoBookingId decides.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DemoFeedbackError("You've already answered this survey.", 409);
    }
    throw err;
  }

  const routing: DemoFeedbackRouting = {
    outcome,
    enrollHref: null,
    similarCourses: [],
    remainingFreeDemos: 0,
    offerComplaint: false,
  };

  if (outcome === "POSITIVE") {
    routing.enrollHref = buildEnrollHref(booking.courseId, booking.studentId);
  } else if (outcome === "NEGATIVE") {
    const [similar, balance] = await Promise.all([
      findSimilarCourses(booking),
      getDemoCouponBalance(parentId),
    ]);
    routing.similarCourses = similar;
    routing.remainingFreeDemos = balance.remainingFree;
    routing.offerComplaint = reason === "TECH_ISSUE";
  }

  return routing;
}

export interface PendingDemoSurvey {
  bookingId: string;
  studentId: string;
  courseId: string;
  courseTitle: string | null;
  teacherName: string;
  endedAt: Date;
  /** True until the Parent has opened the survey page once. */
  neverOpened: boolean;
}

/** Ended demos (last 30 days) the Parent hasn't answered yet, newest first. */
export async function listPendingDemoSurveys(
  parentId: string,
  now: Date = new Date(),
): Promise<PendingDemoSurvey[]> {
  const since = new Date(now.getTime() - SURVEY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const bookings = await prisma.demoBooking.findMany({
    where: {
      parentId,
      status: { in: [DemoBookingStatus.CONFIRMED, DemoBookingStatus.COMPLETED] },
      scheduledAt: { not: null, gte: since, lte: now },
      feedback: { is: null },
    },
    select: bookingSelect,
    orderBy: { scheduledAt: "desc" },
  });

  return bookings
    .filter((b) => isEnded(b, now))
    .map((b) => ({
      bookingId: b.id,
      studentId: b.studentId,
      courseId: b.courseId,
      courseTitle: b.course.courseTitle,
      teacherName: b.teacher.visibleName || `${b.teacher.firstName} ${b.teacher.lastName}`.trim(),
      endedAt: demoEndsAt(b.scheduledAt as Date, b.course.duration),
      neverOpened: !b.surveyOpenedAt,
    }));
}
