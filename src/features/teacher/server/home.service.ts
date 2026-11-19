import { getTeacherCourses } from "@/features/courses/server/course.service";
import type { AttentionItem } from "@/features/parent/components/home/homeLogic";
import { getTeacherCertificateBoard } from "@/features/shared/server/certificate.service";
import { getTeacherOccurrencesInRange } from "@/features/shared/server/scheduleOccurrences.service";
import { getDemoJoinWindow } from "@/features/shared/utils/demoWindow";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { ON_THE_WAY_PAYOUT_STATUSES } from "@/features/shared/utils/teacherEarnings";
import type {
  TeacherHomeCourseDto,
  TeacherHomeDto,
  TeacherHomeSessionDto,
} from "@/features/teacher/types/home";
import { isGoogleMeetEnabled } from "@/lib/googleMeet";
import {
  addDays,
  calendarDateToDate,
  parseDateKey,
  platformWallClockToUtc,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
  DemoBookingStatus,
  EnrollmentStatus,
  HomeworkSubmissionStatus,
  LedgerPayoutStatus,
  RescheduleRequestStatus,
} from "@prisma/client";
import "server-only";

/**
 * Everything the Teacher Home screen needs, in one round trip
 * (`GET /api/teacher/home`).
 *
 * Read-only: it composes data other services already own (calendar
 * occurrences, demos, courses, certificates, the tuition ledger) and writes
 * nothing. Every query is scoped by `teacherId` — that `where` is the access
 * rule.
 */

/** Same statuses the Teacher's enrollment list shows. */
const LISTED: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  EnrollmentStatus.PENDING_ADMIN_APPROVAL,
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
  EnrollmentStatus.COMPLETED,
];
/** "Active" everywhere on the dashboard — the same definition the Courses page uses. */
const RUNNING: EnrollmentStatus[] = [EnrollmentStatus.ACTIVE];

/** Money the teacher has earned that has not reached the bank yet (one list, shared with the Earnings page). */
const OUTSTANDING = [...ON_THE_WAY_PAYOUT_STATUSES] as LedgerPayoutStatus[];

const EARNING_ROWS = 4;
/** Fallback length for a class that has no real end instant (legacy rows). */
const DEFAULT_CLASS_MINUTES = 45;
/** Demos are only worth showing from a few hours back (join window can outlast the slot). */
const DEMO_LOOKBACK_MS = 6 * 60 * 60_000;
const DEMO_LIMIT = 20;
/** Classes are listed this far ahead (covers "This week" and each course's next class). */
const SESSION_HORIZON_DAYS = 60;

type NameParts = { firstName: string; visibleName: string | null };

const nameOf = (s: NameParts) => s.visibleName || s.firstName;
const first = (name: string) => name.split(" ")[0];

export async function getTeacherHome(
  teacherId: string,
  now: Date = new Date(),
): Promise<TeacherHomeDto> {
  const today = todayInPlatformTz(now);
  const horizon = new Date(now.getTime() + SESSION_HORIZON_DAYS * 24 * 60 * 60_000);
  // Stored class dates are UTC midnight of the IST calendar date: today .. horizon (+1 day, end exclusive).
  const rangeFrom = calendarDateToDate(today);
  const rangeTo = calendarDateToDate(addDays(today, SESSION_HORIZON_DAYS + 1));

  const [
    teacher,
    enrollments,
    courseRows,
    occurrences,
    demoRows,
    reschedules,
    homeworkToReview,
    certificates,
    paidAgg,
    outstandingAgg,
    outstandingRows,
    bankAccount,
    blogCount,
  ] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        firstName: true,
        visibleName: true,
        aboutMe: true,
        phone: true,
        city: true,
        address: true,
      },
    }),
    prisma.enrollment.findMany({
      where: { teacherId, status: { in: LISTED } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        courseId: true,
        status: true,
        sessionsPerMonth: true,
        sessionsCompletedInCycle: true,
        student: { select: { id: true, firstName: true, visibleName: true } },
      },
    }),
    getTeacherCourses(teacherId),
    getTeacherOccurrencesInRange(teacherId, rangeFrom, rangeTo),
    prisma.demoBooking.findMany({
      where: {
        teacherId,
        status: DemoBookingStatus.CONFIRMED,
        scheduledAt: { gte: new Date(now.getTime() - DEMO_LOOKBACK_MS), lt: horizon },
      },
      orderBy: { scheduledAt: "asc" },
      take: DEMO_LIMIT,
      select: {
        id: true,
        subject: true,
        scheduledAt: true,
        student: { select: { firstName: true, visibleName: true } },
        course: { select: { id: true, courseTitle: true, duration: true } },
      },
    }),
    prisma.rescheduleRequest.findMany({
      where: { teacherId, status: RescheduleRequestStatus.PENDING_TEACHER_APPROVAL },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        parent: { select: { firstName: true, visibleName: true } },
      },
    }),
    prisma.homeworkSubmission.count({
      where: {
        status: HomeworkSubmissionStatus.SUBMITTED,
        homework: { teacherId },
      },
    }),
    getTeacherCertificateBoard(teacherId),
    prisma.tuitionLedgerEntry.aggregate({
      where: { teacherId, payoutStatus: LedgerPayoutStatus.PAID },
      _sum: { monthlyTeacherPay: true },
    }),
    prisma.tuitionLedgerEntry.aggregate({
      where: { teacherId, payoutStatus: { in: OUTSTANDING } },
      _sum: { monthlyTeacherPay: true },
    }),
    prisma.tuitionLedgerEntry.findMany({
      where: { teacherId, payoutStatus: { in: OUTSTANDING } },
      orderBy: { transactionDate: "desc" },
      take: EARNING_ROWS,
      select: {
        id: true,
        cycleNumber: true,
        monthlyTeacherPay: true,
        payoutStatus: true,
        enrollment: {
          select: { student: { select: { firstName: true, visibleName: true } } },
        },
      },
    }),
    prisma.bankAccount.findUnique({
      where: { teacherId },
      select: { id: true },
    }),
    prisma.blogPost.count({ where: { teacherId } }),
  ]);

  /* ---- students ---- */
  const running = enrollments.filter((e) => RUNNING.includes(e.status));
  const waiting = enrollments.filter(
    (e) => e.status === EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  );
  const studentNames = Array.from(new Set(enrollments.map((e) => nameOf(e.student))));
  const activeStudentCount = new Set(running.map((e) => e.student.id)).size;

  /* ---- sessions: scheduled classes + confirmed demos, still to come ---- */
  const sessions: TeacherHomeSessionDto[] = [];

  for (const o of occurrences) {
    if (o.status !== "SCHEDULED") continue;

    let start: Date;
    if (o.startsAt) {
      start = new Date(o.startsAt);
    } else {
      const day = parseDateKey(o.date);
      if (!day) continue;
      start = platformWallClockToUtc(day, o.time ?? "00:00");
    }

    const end = o.endsAt
      ? new Date(o.endsAt)
      : new Date(start.getTime() + DEFAULT_CLASS_MINUTES * 60_000);

    if (end.getTime() <= now.getTime() || start.getTime() > horizon.getTime()) continue;

    sessions.push({
      id: o.id,
      kind: "class",
      title: o.courseTitle || o.subject || "Class",
      studentName: o.studentName,
      courseId: o.courseId,
      subject: o.subject,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      href: `/teacher/classes/${o.id}/start`,
    });
  }

  for (const b of demoRows) {
    if (!b.scheduledAt) continue;

    const joinWindow = getDemoJoinWindow(
      b.scheduledAt,
      sessionLengthForCourse(b.course.duration),
      now,
    );
    const end = joinWindow.closesAt ?? new Date(b.scheduledAt.getTime() + DEFAULT_CLASS_MINUTES * 60_000);

    if (end.getTime() <= now.getTime()) continue;

    sessions.push({
      id: `demo-${b.id}`,
      kind: "demo",
      title: `Demo: ${b.course.courseTitle || "Demo session"}`,
      studentName: nameOf(b.student),
      courseId: b.course.id,
      subject: b.subject,
      startsAt: b.scheduledAt.toISOString(),
      endsAt: end.toISOString(),
      href: "/teacher/demo",
      demo: {
        bookingId: b.id,
        joinWindow: {
          state: joinWindow.state,
          opensAt: joinWindow.opensAt ? joinWindow.opensAt.toISOString() : null,
          closesAt: joinWindow.closesAt ? joinWindow.closesAt.toISOString() : null,
        },
      },
    });
  }

  sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  /* ---- courses ---- */
  const courses: TeacherHomeCourseDto[] = courseRows.map((c) => {
    const mine = running.filter((e) => e.courseId === c.id);
    const activeStudents = new Set(mine.map((e) => e.student.id)).size;
    const progress = mine.length
      ? Math.round(
          (mine.reduce(
            (n, e) => n + (e.sessionsPerMonth ? e.sessionsCompletedInCycle / e.sessionsPerMonth : 0),
            0,
          ) /
            mine.length) *
            100,
        )
      : 0;

    return {
      id: c.id,
      title: c.courseTitle || "Untitled course",
      subject: c.subject,
      grade: c.grade,
      price: c.price ? Number(c.price) : null,
      approved: c.status === "APPROVED",
      activeStudents,
      progress: Math.min(100, progress),
    };
  });

  /* ---- needs your attention ---- */
  const attention: AttentionItem[] = [];

  if (waiting.length) {
    attention.push({
      key: "review",
      priority: 1,
      title: `${waiting.length} enrollment${waiting.length > 1 ? "s" : ""} waiting for your review`,
      sub: `${waiting.map((e) => first(nameOf(e.student))).join(", ")} · approve, propose a change or reject.`,
      button: "Review",
      href: "/teacher/requests?tab=enrollments",
      primary: true,
      tone: "amber",
    });
  }

  if (reschedules.length) {
    const who = reschedules[0].parent;
    attention.push({
      key: "reschedule",
      priority: 2,
      title:
        reschedules.length > 1
          ? `${reschedules.length} reschedules need your response`
          : "Reschedule needs your response",
      sub: `${who ? nameOf(who) : "A parent"} asked to move a class.`,
      button: "Respond",
      href: "/teacher/requests?tab=reschedules",
      tone: "amber",
    });
  }

  if (homeworkToReview > 0) {
    attention.push({
      key: "homework",
      priority: 3,
      title:
        homeworkToReview > 1
          ? `${homeworkToReview} homework submissions to review`
          : "A homework submission to review",
      sub: "Students are waiting for your feedback.",
      button: "Review",
      href: "/teacher/hw-tests",
      tone: "violet",
    });
  }

  if (certificates.eligible.length) {
    const e = certificates.eligible;
    attention.push({
      key: "certificate",
      priority: 4,
      title: e.length > 1 ? `${e.length} certificates are ready to issue` : "A certificate is ready to issue",
      sub: `${first(e[0].studentName)} completed all sessions. Your decision is final.`,
      button: "Decide",
      href: "/teacher/my-classes?tab=certificates",
      tone: "violet",
    });
  }

  attention.sort((a, b) => a.priority - b.priority);

  /* ---- earnings ---- */
  const earnings = {
    paid: Number(paidAgg._sum.monthlyTeacherPay ?? 0),
    onTheWay: Number(outstandingAgg._sum.monthlyTeacherPay ?? 0),
    rows: outstandingRows.map((r) => ({
      id: r.id,
      name: nameOf(r.enrollment.student),
      cycle: r.cycleNumber,
      processing: r.payoutStatus === LedgerPayoutStatus.PROCESSING,
      amount: Number(r.monthlyTeacherPay),
    })),
  };

  /* ---- finish-setup card ---- */
  const steps = [
    { label: "Add your bank account", done: !!bankAccount, href: "/teacher/earnings?tab=bank" },
    {
      label: "Complete your profile",
      done: !!(
        teacher?.aboutMe?.trim() &&
        teacher.phone?.trim() &&
        teacher.city?.trim() &&
        teacher.address?.trim()
      ),
      href: "/teacher/account?tab=profile",
    },
    { label: "Write your first blog post", done: blogCount > 0, href: "/teacher/blogs" },
  ];
  const left = steps.filter((s) => !s.done);

  return {
    serverNow: now.toISOString(),
    meetEnabled: isGoogleMeetEnabled(),
    firstName: teacher ? first(nameOf(teacher)) : "",
    sessions,
    courses,
    studentNames,
    activeStudentCount,
    reviewCount: waiting.length,
    attention,
    earnings,
    setup: left.length
      ? {
          href: left[0].href,
          done: steps.length - left.length,
          total: steps.length,
          nextLabel: left[0].label,
        }
      : null,
  };
}
