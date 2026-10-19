import {
  notifyDemoReminder,
  notifyDemoSurveyNudge,
  notifyDemoSurveyPrompt,
} from "@/features/shared/server/notificationTriggers.service";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { prisma } from "@/lib/prisma";
import {
  DemoBookingStatus,
  DemoFeedbackOutcome,
  EnrollmentStatus,
} from "@prisma/client";
import "server-only";

/**
 * Demo-journey sweep (Parent journey, Oct 2026). Needs a ~5-minute
 * cadence (the "1 hour before" reminder), so it is scheduled by
 * `scheduler/scheduler.sh` on the Docker host and is NOT in `vercel.json`
 * (Hobby plan: daily crons only). Every step is idempotent: a stamp is
 * claimed with a conditional `updateMany` before anything is sent, so a
 * retried or overlapping run can never double-notify.
 *
 *  1. Reminder 1 day before the demo  (`reminderDayBeforeSentAt`)
 *  2. Reminder ~1 hour before         (`reminderHourBeforeSentAt`)
 *  3. "How was the demo?" once it ended (`endedPromptSentAt`)
 *  4. Nudges for an UNDECIDED survey at +24 h and +3 days
 *     (`DemoFeedback.nudge24hSentAt` / `nudge3dSentAt`), skipped once the
 *     Parent has enrolled that child in that course.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** A demo this long past its end no longer gets the survey prompt. */
const PROMPT_MAX_AGE_DAYS = 7;

export interface DemoReminderResult {
  dayReminders: number;
  hourReminders: number;
  surveyPrompts: number;
  surveyNudges: number;
}

function studentName(s: { firstName: string; visibleName: string | null }) {
  return s.visibleName || s.firstName;
}

export async function runDemoReminderSweep(now: Date = new Date()): Promise<DemoReminderResult> {
  const result: DemoReminderResult = {
    dayReminders: 0,
    hourReminders: 0,
    surveyPrompts: 0,
    surveyNudges: 0,
  };

  const select = {
    id: true,
    parentId: true,
    scheduledAt: true,
    createdAt: true,
    student: { select: { firstName: true, visibleName: true } },
    course: { select: { courseTitle: true, duration: true } },
  } as const;

  // 1 + 2: upcoming demos (within the next 24 h).
  const upcoming = await prisma.demoBooking.findMany({
    where: {
      status: DemoBookingStatus.CONFIRMED,
      scheduledAt: { gt: now, lte: new Date(now.getTime() + DAY) },
      OR: [{ reminderDayBeforeSentAt: null }, { reminderHourBeforeSentAt: null }],
    },
    select: { ...select, reminderDayBeforeSentAt: true, reminderHourBeforeSentAt: true },
  });

  for (const b of upcoming) {
    try {
      const startsAt = b.scheduledAt as Date;
      const msUntil = startsAt.getTime() - now.getTime();
      const name = studentName(b.student);

      // The day-before reminder is skipped for a demo booked inside the last 24 h.
      const bookedInsideDay = b.createdAt.getTime() > startsAt.getTime() - DAY;

      if (!b.reminderHourBeforeSentAt && msUntil <= HOUR) {
        const claimed = await prisma.demoBooking.updateMany({
          where: { id: b.id, reminderHourBeforeSentAt: null },
          data: {
            reminderHourBeforeSentAt: now,
            // An hour-before reminder makes a day-before one pointless.
            ...(b.reminderDayBeforeSentAt ? {} : { reminderDayBeforeSentAt: now }),
          },
        });
        if (claimed.count === 1) {
          await notifyDemoReminder({
            parentId: b.parentId,
            bookingId: b.id,
            courseTitle: b.course.courseTitle,
            studentName: name,
            kind: "HOUR",
          });
          result.hourReminders += 1;
        }
      } else if (!b.reminderDayBeforeSentAt && msUntil > HOUR) {
        const claimed = await prisma.demoBooking.updateMany({
          where: { id: b.id, reminderDayBeforeSentAt: null },
          data: { reminderDayBeforeSentAt: now },
        });
        if (claimed.count === 1 && !bookedInsideDay) {
          await notifyDemoReminder({
            parentId: b.parentId,
            bookingId: b.id,
            courseTitle: b.course.courseTitle,
            studentName: name,
            kind: "DAY",
          });
          result.dayReminders += 1;
        }
      }
    } catch (err) {
      console.error(`Demo reminder failed for booking ${b.id}:`, err);
    }
  }

  // 3: survey prompt once a demo has ended.
  const started = await prisma.demoBooking.findMany({
    where: {
      status: { in: [DemoBookingStatus.CONFIRMED, DemoBookingStatus.COMPLETED] },
      scheduledAt: {
        gte: new Date(now.getTime() - PROMPT_MAX_AGE_DAYS * DAY),
        lte: now,
      },
      endedPromptSentAt: null,
      feedback: { is: null },
    },
    select,
  });

  for (const b of started) {
    try {
      const endsAt = (b.scheduledAt as Date).getTime() + sessionLengthForCourse(b.course.duration) * MIN;
      if (endsAt > now.getTime()) continue;

      const claimed = await prisma.demoBooking.updateMany({
        where: { id: b.id, endedPromptSentAt: null },
        data: { endedPromptSentAt: now },
      });
      if (claimed.count !== 1) continue;

      await notifyDemoSurveyPrompt({
        parentId: b.parentId,
        bookingId: b.id,
        courseTitle: b.course.courseTitle,
        studentName: studentName(b.student),
      });
      result.surveyPrompts += 1;
    } catch (err) {
      console.error(`Demo survey prompt failed for booking ${b.id}:`, err);
    }
  }

  // 4: nudges for UNDECIDED surveys.
  const undecided = await prisma.demoFeedback.findMany({
    where: {
      outcome: DemoFeedbackOutcome.UNDECIDED,
      intent: "NEED_TIME",
      createdAt: { lte: new Date(now.getTime() - DAY) },
      OR: [{ nudge24hSentAt: null }, { nudge3dSentAt: null }],
    },
    select: {
      id: true,
      parentId: true,
      studentId: true,
      courseId: true,
      createdAt: true,
      nudge24hSentAt: true,
      nudge3dSentAt: true,
      demoBooking: {
        select: {
          student: { select: { firstName: true, visibleName: true } },
          course: { select: { courseTitle: true } },
        },
      },
    },
    take: 500,
  });

  for (const f of undecided) {
    try {
      const age = now.getTime() - f.createdAt.getTime();
      const due3d = age >= 3 * DAY && !f.nudge3dSentAt;
      const due24h = !due3d && !f.nudge24hSentAt && !f.nudge3dSentAt;
      if (!due3d && !due24h) continue;

      const claimed = await prisma.demoFeedback.updateMany({
        where: due3d
          ? { id: f.id, nudge3dSentAt: null }
          : { id: f.id, nudge24hSentAt: null },
        data: due3d
          ? { nudge3dSentAt: now, ...(f.nudge24hSentAt ? {} : { nudge24hSentAt: now }) }
          : { nudge24hSentAt: now },
      });
      if (claimed.count !== 1) continue;

      // Already enrolled (any non-dead status)? Nothing left to nudge.
      const enrolled = await prisma.enrollment.findFirst({
        where: {
          parentId: f.parentId,
          studentId: f.studentId,
          courseId: f.courseId,
          status: { notIn: [EnrollmentStatus.REJECTED, EnrollmentStatus.CANCELLED] },
        },
        select: { id: true },
      });
      if (enrolled) continue;

      await notifyDemoSurveyNudge({
        parentId: f.parentId,
        courseId: f.courseId,
        studentId: f.studentId,
        courseTitle: f.demoBooking.course.courseTitle,
        studentName: studentName(f.demoBooking.student),
        after: due3d ? "3D" : "24H",
      });
      result.surveyNudges += 1;
    } catch (err) {
      console.error(`Demo survey nudge failed for feedback ${f.id}:`, err);
    }
  }

  return result;
}
