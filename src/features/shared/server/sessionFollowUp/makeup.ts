import { isGroupType } from "@/features/courses/utils/groupClass";
import { loadSlotContext } from "@/features/shared/server/cycleSlots.service";
import { lockGroupClass } from "@/features/shared/server/groupClass.service";
import { excusedMakeupDeadlineDate } from "@/features/shared/utils/cyclePlan";
import {
    findNextFreeSlot,
    slotScheduledDate,
    type FreeSlot,
    type SlotContext,
} from "@/features/shared/utils/makeupSlots";
import { DEFAULT_SESSION_LENGTH_MINUTES } from "@/lib/platformConfig";
import {
    compareDates,
    dateToCalendarDate,
    isValidTimeOfDay,
    todayInPlatformTz,
    type CalendarDate,
} from "@/lib/platformTime";
import {
    ClassSessionStatus,
    Prisma
} from "@prisma/client";
import "server-only";
import { FollowUpRetryLater, FollowUpSession } from './base';

/**
 * Group class (Nov 2026): the make-up of a lost group class is ONE class for
 * the whole group, not one slot per student. The first student's follow-up
 * picks the slot — free for the teacher and for every student who lost the
 * class, and inside the tightest of their cycle windows. Every later student's
 * follow-up books that same slot for their own enrollment. Money, counting and
 * the cycle rules stay per student; only the time is shared.
 *
 * Runs inside the caller's transaction, after the cycle lock and under the
 * group lock, so students whose follow-ups run at the same moment still end up
 * on the same slot.
 */
async function findGroupMakeupSlot(
  tx: Prisma.TransactionClient,
  session: FollowUpSession,
  input: {
    now: Date;
    today: CalendarDate;
    deadline: CalendarDate;
    time: string;
    lengthMinutes: number;
  },
): Promise<FreeSlot | null> {
  const { now, today, time, lengthMinutes } = input;
  const courseId = session.enrollment.courseId;
  const startsAt = session.startsAt as Date;

  // 1. A classmate's make-up for this same lost class already exists: share it.
  const shared = await tx.classSession.findFirst({
    where: {
      makeupForSessionId: { not: session.id },
      makeupFor: { is: { startsAt, enrollment: { courseId } } },
    },
    select: { startsAt: true, endsAt: true, scheduledDate: true },
    orderBy: { createdAt: "asc" },
  });

  if (shared?.startsAt && shared.endsAt) {
    const date = dateToCalendarDate(shared.scheduledDate);
    const fits =
      compareDates(date, input.deadline) <= 0 &&
      shared.startsAt.getTime() > now.getTime() &&
      // This student must be free then: no class of this enrollment on that
      // date, and no other class of theirs overlapping it. (The teacher is
      // already booked there — by this very make-up — so only the student
      // is checked.)
      (await tx.classSession.findFirst({
        where: {
          OR: [
            { enrollmentId: session.enrollmentId, scheduledDate: shared.scheduledDate },
            {
              studentId: session.studentId,
              status: ClassSessionStatus.SCHEDULED,
              startsAt: { lt: shared.endsAt },
              endsAt: { gt: shared.startsAt },
            },
          ],
        },
        select: { id: true },
      })) === null;

    return fits ? { date, startsAt: shared.startsAt, endsAt: shared.endsAt } : null;
  }

  // 2. First one in: pick a slot that works for everyone who lost the class.
  const lost = await tx.classSession.findMany({
    where: {
      startsAt,
      enrollment: { courseId },
      OR: [
        // Siblings whose own outcome isn't written yet are counted too: it is
        // safer to over-constrain the slot than to leave them out.
        { status: ClassSessionStatus.SCHEDULED },
        { status: ClassSessionStatus.TEACHER_NO_SHOW },
        { status: ClassSessionStatus.EXCUSED },
        { status: ClassSessionStatus.CANCELLED, cancelledByRole: { in: ["TEACHER", "SYSTEM"] } },
      ],
    },
    select: {
      enrollmentId: true,
      studentId: true,
      status: true,
      cycle: { select: { startDate: true, extendedDeadline: true } },
    },
  });

  // The tightest cycle window among them: a slot beyond it would forfeit that
  // student's make-up.
  let deadline = input.deadline;

  for (const member of lost) {
    if (!member.cycle) continue;

    const memberDeadline = excusedMakeupDeadlineDate(
      dateToCalendarDate(member.cycle.startDate),
      member.status === ClassSessionStatus.EXCUSED && member.cycle.extendedDeadline
        ? dateToCalendarDate(member.cycle.extendedDeadline)
        : null,
    );

    if (compareDates(memberDeadline, deadline) < 0) deadline = memberDeadline;
  }

  if (compareDates(today, deadline) > 0) return null;

  // Merge each student's own context (their booked dates and other classes)
  // with the teacher's (leave, other classes — the same for everyone).
  const members = lost.length > 0 ? lost : [session];
  const occupied = new Set<string>();
  const busy: SlotContext["busy"][number][] = [];
  let leaves: SlotContext["leaves"] = [];

  for (const member of members) {
    const context = await loadSlotContext(tx, {
      enrollmentId: member.enrollmentId,
      teacherId: session.teacherId,
      studentId: member.studentId,
      from: today,
      to: deadline,
    });

    context.occupiedDateKeys.forEach((key) => occupied.add(key));
    busy.push(...context.busy);
    leaves = context.leaves;
  }

  return findNextFreeSlot({
    now,
    earliest: today,
    deadline,
    scheduleDays: session.enrollment.scheduleDays,
    time,
    lengthMinutes,
    context: { occupiedDateKeys: occupied, leaves, busy },
  });
}

/**
 * Adds one make-up session on the next free slot on or before the
 * cycle's day 45 (or, for an excused class, its extended deadline). Returns null if none fits. The make-up is a normal
 * cycle session (next session number, same teacher, student and
 * length) so Start / Join / End, reschedule and counting all work on
 * it unchanged.
 */
export async function createMakeup(
  tx: Prisma.TransactionClient,
  session: FollowUpSession,
  cycleStartDate: Date,
  now: Date,
  /** Phase 2.2: the cycle's extended deadline — passed ONLY for an excused class's make-up. */
  extendedDeadline: Date | null = null,
): Promise<{ id: string; startsAt: Date } | null> {
  const { enrollment } = session;
  const time = enrollment.scheduleTime;

  if (!isValidTimeOfDay(time) || enrollment.scheduleDays.length === 0) {
    return null;
  }

  const deadline = excusedMakeupDeadlineDate(
    dateToCalendarDate(cycleStartDate),
    extendedDeadline ? dateToCalendarDate(extendedDeadline) : null,
  );
  const today = todayInPlatformTz(now);

  if (compareDates(today, deadline) > 0) return null;

  const lengthMinutes =
    session.lengthMinutes ?? enrollment.sessionLengthMinutes ?? DEFAULT_SESSION_LENGTH_MINUTES;

  let slot: FreeSlot | null;

  if (isGroupType(enrollment.course.type) && session.startsAt) {
    // Group class: one shared make-up slot for the whole group.
    await lockGroupClass(tx, enrollment.courseId, session.startsAt);

    slot = await findGroupMakeupSlot(tx, session, { now, today, deadline, time, lengthMinutes });
  } else {
    const context = await loadSlotContext(tx, {
      enrollmentId: session.enrollmentId,
      teacherId: session.teacherId,
      studentId: session.studentId,
      from: today,
      to: deadline,
    });

    slot = findNextFreeSlot({
      now,
      earliest: today,
      deadline,
      scheduleDays: enrollment.scheduleDays,
      time,
      lengthMinutes,
      context,
    });
  }

  if (!slot) return null;

  const highest = await tx.classSession.aggregate({
    where: { cycleId: session.cycleId },
    _max: { sessionNumber: true },
  });

  const id = crypto.randomUUID();

  const result = await tx.classSession.createMany({
    data: [
      {
        id,
        enrollmentId: session.enrollmentId,
        cycleId: session.cycleId,
        sessionNumber: (highest._max.sessionNumber ?? 0) + 1,
        teacherId: session.teacherId,
        studentId: session.studentId,
        parentId: session.parentId,
        scheduledDate: slotScheduledDate(slot),
        scheduledTime: time,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        lengthMinutes,
        makeupForSessionId: session.id,
      },
    ],
    skipDuplicates: true,
  });

  // A unique clash (another request took this date or session
  // number a moment ago): roll everything back and let the sweep retry.
  if (result.count === 0) {
    throw new FollowUpRetryLater();
  }

  return { id, startsAt: slot.startsAt };
}
