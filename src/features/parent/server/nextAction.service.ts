import { isRenewalWindowOpen } from "@/features/parent/server/renewal/plan";
import {
  buildEnrollHref,
  listPendingDemoSurveys,
} from "@/features/parent/server/demoFeedback.service";
import { getDemoCouponBalance } from "@/features/parent/server/demoCoupon/shared";
import {
  daysBetween,
  dateToCalendarDate,
  formatPlatformTime,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
  ClassSessionStatus,
  DemoBookingStatus,
  EnrollmentStatus,
} from "@prisma/client";
import "server-only";

/**
 * Dashboard "next best action" card (Parent journey, Oct 2026).
 *
 * One card, decided server-side from data that already exists (no new
 * tables). Exactly one stage wins; the order below is the priority:
 *
 *   SURVEY_PENDING     a finished demo has no survey answer yet
 *   RENEW              a cycle-model enrollment is inside its renewal window
 *   AWAITING_APPROVAL  paid, waiting for approval (or needs the parent's OK)
 *   DEMO_BOOKED        an upcoming demo
 *   ENROLL_READY       positive / undecided survey, not enrolled yet
 *   ACTIVE             running classes: next class
 *   REBOOK             everything finished / lapsed / rejected
 *   NEW                nothing yet: book the free demo
 *
 * Parent-facing copy never names Admin (same rule as
 * `enrollmentStatus.ts`).
 */

export type NextActionStage =
  | "SURVEY_PENDING"
  | "RENEW"
  | "AWAITING_APPROVAL"
  | "DEMO_BOOKED"
  | "ENROLL_READY"
  | "ACTIVE"
  | "REBOOK"
  | "NEW";

export interface NextAction {
  stage: NextActionStage;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  /** Set only while the Parent has never opened that survey: the dashboard
   *  redirects to it once, then falls back to the card. */
  autoOpenSurveyId: string | null;
}

const DEAD_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.REJECTED,
  EnrollmentStatus.CANCELLED,
];
const PENDING_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  EnrollmentStatus.PENDING_ADMIN_APPROVAL,
  EnrollmentStatus.PENDING_APPROVAL,
];
const RUNNING_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.APPROVED,
];

function childName(s: { firstName: string; visibleName: string | null }) {
  return s.visibleName || s.firstName;
}
function teacherName(t: { firstName: string; lastName: string; visibleName: string | null }) {
  return t.visibleName || `${t.firstName} ${t.lastName}`.trim();
}

export async function getParentNextAction(
  parentId: string,
  now: Date = new Date(),
): Promise<NextAction> {
  const today = todayInPlatformTz(now);

  const [pendingSurveys, enrollments, upcomingDemo, feedbacks, nextSession, balance] =
    await Promise.all([
      listPendingDemoSurveys(parentId, now),
      prisma.enrollment.findMany({
        where: { parentId },
        select: {
          id: true,
          status: true,
          isLegacy: true,
          studentId: true,
          courseId: true,
          course: { select: { courseTitle: true } },
          student: { select: { firstName: true, visibleName: true } },
          cycles: {
            orderBy: { cycleNumber: "desc" },
            take: 1,
            select: { endDate: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.demoBooking.findFirst({
        where: {
          parentId,
          status: DemoBookingStatus.CONFIRMED,
          scheduledAt: { gt: now },
        },
        orderBy: { scheduledAt: "asc" },
        select: {
          scheduledAt: true,
          student: { select: { firstName: true, visibleName: true } },
          course: { select: { courseTitle: true } },
        },
      }),
      prisma.demoFeedback.findMany({
        where: { parentId, outcome: { in: ["POSITIVE", "UNDECIDED"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          outcome: true,
          studentId: true,
          courseId: true,
          demoBooking: {
            select: {
              student: { select: { firstName: true, visibleName: true } },
              teacher: { select: { firstName: true, lastName: true, visibleName: true } },
              course: { select: { courseTitle: true } },
            },
          },
        },
      }),
      prisma.classSession.findFirst({
        where: {
          parentId,
          status: ClassSessionStatus.SCHEDULED,
          startsAt: { gte: now },
        },
        orderBy: { startsAt: "asc" },
        select: {
          enrollmentId: true,
          startsAt: true,
          enrollment: {
            select: {
              course: { select: { courseTitle: true } },
              student: { select: { firstName: true, visibleName: true } },
            },
          },
        },
      }),
      getDemoCouponBalance(parentId),
    ]);

  // 1. A finished demo with no survey answer.
  const survey = pendingSurveys[0];
  if (survey) {
    return {
      stage: "SURVEY_PENDING",
      title: "How was the demo?",
      body: `Tell us how "${survey.courseTitle ?? "the demo"}" with ${survey.teacherName} went — 3 quick taps.`,
      ctaLabel: "Answer 3 questions",
      href: `/parent/demo-feedback/${survey.bookingId}`,
      autoOpenSurveyId: pendingSurveys.find((s) => s.neverOpened)?.bookingId ?? null,
    };
  }

  const base = { autoOpenSurveyId: null };

  // 2. Cycle ending soon — renewal window open and not yet renewed (the
  //    latest cycle is the one still running).
  const renewable = enrollments
    .filter((e) => e.status === EnrollmentStatus.ACTIVE && !e.isLegacy && e.cycles[0])
    .map((e) => ({ e, end: e.cycles[0].endDate }))
    .filter(({ end }) => isRenewalWindowOpen(end, today))
    .sort((a, b) => a.end.getTime() - b.end.getTime())[0];

  if (renewable) {
    const daysLeft = daysBetween(today, dateToCalendarDate(renewable.end));
    const when =
      daysLeft < 0 ? "has ended" : daysLeft === 0 ? "ends today" : daysLeft === 1 ? "ends tomorrow" : `ends in ${daysLeft} days`;
    return {
      ...base,
      stage: "RENEW",
      title: "Renew to keep the classes going",
      body: `${childName(renewable.e.student)}'s "${renewable.e.course.courseTitle ?? "course"}" cycle ${when}. Renew with the same schedule in one tap.`,
      ctaLabel: "Renew now",
      href: `/parent/my-classes/${renewable.e.id}`,
    };
  }

  // 3. Paid, waiting on approval (or needs the Parent's confirmation).
  const pending = enrollments.find((e) => PENDING_STATUSES.includes(e.status));
  if (pending) {
    const reconfirm = pending.status === EnrollmentStatus.PENDING_PARENT_RECONFIRMATION;
    return {
      ...base,
      stage: "AWAITING_APPROVAL",
      title: reconfirm ? "Your teacher proposed a change" : "Your enrollment is being reviewed",
      body: reconfirm
        ? `Please confirm the new schedule for ${childName(pending.student)}'s "${pending.course.courseTitle ?? "course"}".`
        : `Payment received for "${pending.course.courseTitle ?? "the course"}". We'll notify you as soon as classes are ready.`,
      ctaLabel: reconfirm ? "Review change" : "See progress",
      href: "/parent/my-classes",
    };
  }

  // 4. An upcoming demo.
  if (upcomingDemo?.scheduledAt) {
    return {
      ...base,
      stage: "DEMO_BOOKED",
      title: "Your demo is booked",
      body: `${childName(upcomingDemo.student)}'s demo for "${upcomingDemo.course.courseTitle ?? "the course"}" is on ${formatPlatformTime(upcomingDemo.scheduledAt, true)}.`,
      ctaLabel: "View demo",
      href: "/parent/free-demo",
    };
  }

  // 5. Positive / undecided survey and not enrolled yet (positive first).
  const enrolledKeys = new Set(
    enrollments
      .filter((e) => !DEAD_STATUSES.includes(e.status))
      .map((e) => `${e.studentId}:${e.courseId}`),
  );
  const ready = feedbacks
    .filter((f) => !enrolledKeys.has(`${f.studentId}:${f.courseId}`))
    .sort((a, b) => Number(b.outcome === "POSITIVE") - Number(a.outcome === "POSITIVE"))[0];

  if (ready) {
    return {
      ...base,
      stage: "ENROLL_READY",
      title: `Enroll with ${teacherName(ready.demoBooking.teacher)}`,
      body:
        ready.outcome === "POSITIVE"
          ? `${childName(ready.demoBooking.student)} enjoyed the demo. Your details are filled in — pick a plan and start.`
          : `Still deciding on "${ready.demoBooking.course.courseTitle ?? "the course"}"? It's saved for you whenever you're ready.`,
      ctaLabel: "Enroll now",
      href: buildEnrollHref(ready.courseId, ready.studentId),
    };
  }

  // 6. Running classes.
  const running = enrollments.some((e) => RUNNING_STATUSES.includes(e.status));
  if (running) {
    if (nextSession?.startsAt) {
      return {
        ...base,
        stage: "ACTIVE",
        title: "Your next class",
        body: `${childName(nextSession.enrollment.student)} · "${nextSession.enrollment.course.courseTitle ?? "class"}" on ${formatPlatformTime(nextSession.startsAt, true)}.`,
        ctaLabel: "Open class",
        href: `/parent/my-classes/${nextSession.enrollmentId}`,
      };
    }
    return {
      ...base,
      stage: "ACTIVE",
      title: "Your classes are running",
      body: "See progress, homework and chat for each course.",
      ctaLabel: "Open My Classes",
      href: "/parent/my-classes",
    };
  }

  // 7. Had enrollments, none running now.
  if (enrollments.length > 0) {
    return {
      ...base,
      stage: "REBOOK",
      title: "Ready for the next course?",
      body: "Book again with the same teacher or try another course.",
      ctaLabel: "Browse courses",
      href: "/parent/courses",
    };
  }

  // 8. Brand new (or only a negative survey so far).
  return {
    ...base,
    stage: "NEW",
    title: balance.remainingFree > 0 ? "Book your free demo" : "Find the right course",
    body:
      balance.remainingFree > 0
        ? `Try a class before you commit — you have ${balance.remainingFree} free demo${balance.remainingFree === 1 ? "" : "s"} left.`
        : "Browse courses and teachers, or book a demo.",
    ctaLabel: balance.remainingFree > 0 ? "Find a course" : "Browse courses",
    href: "/parent/courses",
  };
}
