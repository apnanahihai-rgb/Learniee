import {
  notifyCycleEnded,
  notifyRenewalReminder,
} from "@/features/shared/server/notificationTriggers.service";
import { isRenewalWindowOpen } from "@/features/parent/server/renewal/plan";
import {
  addDays,
  calendarDateToDate,
  dateToCalendarDate,
  daysBetween,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { EnrollmentPlanType, EnrollmentStatus, Prisma } from "@prisma/client";
import "server-only";

/**
 * Renewal reminders (Parent journey, Oct 2026) for cycle-model
 * enrollments, keyed off the LATEST cycle's `endDate` (inclusive):
 *
 *   7 days left — "Renewal open" (soft)
 *   5 days left — main reminder, one-tap "Renew same schedule"
 *   2 days left — last reminder
 *   after the end date — "Cycle ended" (once, within 3 days)
 *
 * Window, not exact-day match (same reasoning as the due-date sweep):
 * a daily cron can drift, so each tier is "due" once `daysLeft` is at or
 * under it, and only the highest tier reached is sent — a missed day
 * never produces two reminders at once. Each tier has its own stamp on
 * `EnrollmentCycle`, so every cycle gets its own set. WEEKLY plans only
 * get the 2-day tier (a 7-day cycle is already "inside" the window the
 * moment it starts). Renewal itself only needs the cycle to be the
 * latest one: once renewed, a newer cycle exists and the old one is
 * never looked at again.
 *
 * Runs from the existing daily `/api/cron/due-date-reminders` route, so
 * no scheduler change is needed. Safe to re-run.
 */

const ENDED_NOTICE_MAX_DAYS = 3;

export interface RenewalReminderResult {
  checked: number;
  reminded: number;
  endedNotices: number;
}

type Tier = 7 | 5 | 2;

const STAMP = {
  7: "renewalReminder7SentAt",
  5: "renewalReminder5SentAt",
  2: "renewalReminder2SentAt",
} as const;

/** `where` that only matches while this tier's stamp is still empty. */
function claimWhere(id: string, tier: Tier): Prisma.EnrollmentCycleWhereInput {
  if (tier === 7) return { id, renewalReminder7SentAt: null };
  if (tier === 5) return { id, renewalReminder5SentAt: null };
  return { id, renewalReminder2SentAt: null };
}

/** Stamps this tier plus any higher-day tier that was skipped over. */
function claimData(
  tier: Tier,
  now: Date,
  alreadySent: { 7: boolean; 5: boolean },
): Prisma.EnrollmentCycleUpdateManyMutationInput {
  const data: Prisma.EnrollmentCycleUpdateManyMutationInput = {};
  if (tier === 7) data.renewalReminder7SentAt = now;
  if (tier === 5) {
    data.renewalReminder5SentAt = now;
    if (!alreadySent[7]) data.renewalReminder7SentAt = now;
  }
  if (tier === 2) {
    data.renewalReminder2SentAt = now;
    if (!alreadySent[7]) data.renewalReminder7SentAt = now;
    if (!alreadySent[5]) data.renewalReminder5SentAt = now;
  }
  return data;
}

function tierFor(daysLeft: number, plan: EnrollmentPlanType): Tier | null {
  if (daysLeft < 0) return null;
  if (daysLeft <= 2) return 2;
  if (plan === EnrollmentPlanType.WEEKLY) return null;
  if (daysLeft <= 5) return 5;
  if (daysLeft <= 7) return 7;
  return null;
}

export async function runRenewalReminderSweep(now: Date = new Date()): Promise<RenewalReminderResult> {
  const today = todayInPlatformTz(now);
  const from = calendarDateToDate(addDays(today, -ENDED_NOTICE_MAX_DAYS));
  const to = calendarDateToDate(addDays(today, 7));

  const enrollments = await prisma.enrollment.findMany({
    where: {
      isLegacy: false,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      cycles: { some: { endDate: { gte: from, lte: to } } },
    },
    select: {
      id: true,
      parentId: true,
      status: true,
      planType: true,
      courseId: true,
      course: { select: { courseTitle: true } },
      student: { select: { firstName: true, visibleName: true } },
      cycles: { orderBy: { cycleNumber: "desc" }, take: 1 },
    },
    take: 1000,
  });

  const result: RenewalReminderResult = { checked: enrollments.length, reminded: 0, endedNotices: 0 };

  for (const e of enrollments) {
    try {
      const cycle = e.cycles[0];
      if (!cycle) continue;

      const daysLeft = daysBetween(today, dateToCalendarDate(cycle.endDate));
      const name = e.student.visibleName || e.student.firstName;

      // After the end date: one "cycle ended" message.
      if (daysLeft < 0) {
        if (daysLeft < -ENDED_NOTICE_MAX_DAYS || cycle.cycleEndedNoticeSentAt) continue;

        const claimed = await prisma.enrollmentCycle.updateMany({
          where: { id: cycle.id, cycleEndedNoticeSentAt: null },
          data: { cycleEndedNoticeSentAt: now },
        });
        if (claimed.count !== 1) continue;

        await notifyCycleEnded({
          parentId: e.parentId,
          enrollmentId: e.id,
          courseId: e.courseId,
          courseTitle: e.course.courseTitle,
          studentName: name,
          stillRenewable: e.status === EnrollmentStatus.ACTIVE,
        });
        result.endedNotices += 1;
        continue;
      }

      // Reminders only make sense while the Parent can still renew.
      if (e.status !== EnrollmentStatus.ACTIVE) continue;
      if (!isRenewalWindowOpen(cycle.endDate, today)) continue;

      const tier = tierFor(daysLeft, e.planType);
      if (!tier || cycle[STAMP[tier]]) continue;

      // Claim this tier, and mark any earlier tier we skipped past as done.
      const claimed = await prisma.enrollmentCycle.updateMany({
        where: claimWhere(cycle.id, tier),
        data: claimData(tier, now, {
          7: !!cycle.renewalReminder7SentAt,
          5: !!cycle.renewalReminder5SentAt,
        }),
      });
      if (claimed.count !== 1) continue;

      await notifyRenewalReminder({
        parentId: e.parentId,
        enrollmentId: e.id,
        courseTitle: e.course.courseTitle,
        studentName: name,
        daysLeft,
        tier,
      });
      result.reminded += 1;
    } catch (err) {
      console.error(`Renewal reminder failed for enrollment ${e.id}:`, err);
    }
  }

  return result;
}
