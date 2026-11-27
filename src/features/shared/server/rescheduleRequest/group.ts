import { lockCycle } from "@/features/shared/server/cycleSlots.service";
import {
    listScheduledGroupMembers,
    type GroupSessionRef,
} from "@/features/shared/server/groupClass.service";
import {
    notifyGroupClassMoved,
    notifyRescheduleResponded,
} from "@/features/shared/server/notificationTriggers.service";
import {
    calendarDateToDate,
    parseDateKey,
    platformWallClockToUtc,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestedBy,
    RescheduleRequestStatus,
} from "@prisma/client";
import "server-only";
import {
    assertCycleSlotAllowed,
    assertNotOnTeacherLeave,
    assertUnderRescheduleCap,
    isCycleModelSession,
    PENDING_STATUSES,
    requestInclude,
    RescheduleRequestError,
} from './base';

/**
 * Group classes (Nov 2026): a group class is ONE class, so it is moved for
 * the whole group at once — never for a single student.
 *
 *   - Only the teacher moves a group class. The move applies to every
 *     student's session of that class immediately (no per-parent approval to
 *     collect), and each parent is told the new time. A parent who can't make
 *     it can still cancel their own seat.
 *   - Every rule that guards a normal reschedule is checked for EVERY student
 *     and any one failing stops the whole move: 4 hours' notice, the cycle
 *     deadline, the 2-reschedule cap, the teacher's leave, and a clash for the
 *     teacher or any student.
 *   - Each student gets their own APPROVED RescheduleRequest row, so history
 *     and the per-class cap stay per enrollment exactly as before.
 *
 * `existing` is a still-pending request that this move answers (a request
 * raised before group classes moved as one); it is marked APPROVED instead of
 * a second row being created for that student.
 */
export async function rescheduleGroupClass(input: {
  session: GroupSessionRef & { teacherId: string };
  proposedDate: string;
  proposedTime: string | null;
  reason: string | null;
  existing?: { id: string; classSessionId: string; responseNote: string | null };
}) {
  const dateKey = parseDateKey(input.proposedDate.trim().slice(0, 10));

  if (!dateKey) {
    throw new RescheduleRequestError("Invalid proposed date.");
  }

  const now = new Date();
  const members = await listScheduledGroupMembers(input.session);

  if (members.length === 0) {
    throw new RescheduleRequestError(
      "This class is no longer scheduled — nothing to reschedule.",
      409,
    );
  }

  const teacherId = input.session.teacherId;
  const proposedDate = calendarDateToDate(dateKey);

  // The same rules as a single class, for every student of the group.
  for (const member of members) {
    if (member.teacherStartedAt || member.studentJoinedAt) {
      throw new RescheduleRequestError(
        "This group class has already started, so it can't be rescheduled.",
        409,
      );
    }

    if (!isCycleModelSession(member)) {
      throw new RescheduleRequestError("This group class can't be rescheduled.", 409);
    }

    await assertUnderRescheduleCap(member.id);
    await assertCycleSlotAllowed(member, dateKey, input.proposedTime, now);
  }

  await assertNotOnTeacherLeave(teacherId, proposedDate);

  // assertCycleSlotAllowed has already checked the time is valid.
  const time = input.proposedTime ?? members[0].scheduledTime;

  if (!time) {
    throw new RescheduleRequestError("A class time is required to reschedule this class.");
  }

  const startsAt = platformWallClockToUtc(dateKey, time);
  const longest = Math.max(...members.map((m) => m.lengthMinutes ?? 0));
  const endsAt = new Date(startsAt.getTime() + longest * 60_000);
  const memberIds = members.map((m) => m.id);

  // The group's own classes (at their old time) don't count as a clash.
  const clash = await prisma.classSession.findFirst({
    where: {
      id: { notIn: memberIds },
      status: ClassSessionStatus.SCHEDULED,
      OR: [{ teacherId }, { studentId: { in: members.map((m) => m.studentId) } }],
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });

  if (clash) {
    throw new RescheduleRequestError(
      "That time overlaps another class of the teacher or of one of the students. Pick a different time.",
      409,
    );
  }

  const sameDay = await prisma.classSession.findFirst({
    where: {
      enrollmentId: { in: members.map((m) => m.enrollmentId) },
      scheduledDate: proposedDate,
      id: { notIn: memberIds },
    },
    select: { id: true },
  });

  if (sameDay) {
    throw new RescheduleRequestError(
      "One of the students already has another class on that date. Pick a different date.",
      409,
    );
  }

  const cycleIds = [...new Set(members.flatMap((m) => (m.cycleId ? [m.cycleId] : [])))].sort();

  const requests = await prisma.$transaction(
    async (tx) => {
      // Same order every time, so two moves can't wait on each other.
      for (const cycleId of cycleIds) {
        await lockCycle(tx, cycleId);
      }

      const created: Array<{ id: string; classSessionId: string; existing: boolean }> = [];

      for (const member of members) {
        const moved = await tx.classSession.updateMany({
          // Re-checked inside the write so a Start/Join that lands at the
          // same moment can't be overwritten by the move.
          where: {
            id: member.id,
            status: ClassSessionStatus.SCHEDULED,
            teacherStartedAt: null,
            studentJoinedAt: null,
          },
          data: {
            scheduledDate: proposedDate,
            scheduledTime: time,
            startsAt,
            endsAt: new Date(startsAt.getTime() + (member.lengthMinutes ?? longest) * 60_000),
          },
        });

        if (moved.count === 0) {
          throw new RescheduleRequestError(
            "The class just started or changed, so it couldn't be moved. Please try again.",
            409,
          );
        }

        // Anything still waiting on this class is moot once it has moved.
        await tx.rescheduleRequest.updateMany({
          where: {
            classSessionId: member.id,
            status: { in: PENDING_STATUSES },
            ...(input.existing ? { id: { not: input.existing.id } } : {}),
          },
          data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
        });

        if (input.existing && input.existing.classSessionId === member.id) {
          await tx.rescheduleRequest.update({
            where: { id: input.existing.id },
            data: {
              status: RescheduleRequestStatus.APPROVED,
              responseNote: input.existing.responseNote,
              respondedAt: now,
              proposedTime: time,
            },
          });

          created.push({ id: input.existing.id, classSessionId: member.id, existing: true });
          continue;
        }

        const row = await tx.rescheduleRequest.create({
          data: {
            classSessionId: member.id,
            enrollmentId: member.enrollmentId,
            teacherId: member.teacherId,
            parentId: member.parentId,
            requestedBy: RescheduleRequestedBy.TEACHER,
            originalScheduledDate: member.scheduledDate,
            originalScheduledTime: member.scheduledTime,
            proposedDate,
            proposedTime: time,
            reason: input.reason,
            status: RescheduleRequestStatus.APPROVED,
            responseNote: "Group class moved by the teacher for the whole group.",
            respondedAt: now,
          },
          select: { id: true },
        });

        created.push({ id: row.id, classSessionId: member.id, existing: false });
      }

      return created;
    },
    { timeout: 20_000 },
  );

  // Tell every parent (the one whose own request this answered gets the
  // normal "approved" notice instead).
  for (const request of requests) {
    if (request.existing) {
      await notifyRescheduleResponded(request.id, true);
    } else {
      await notifyGroupClassMoved(request.id);
    }
  }

  const own =
    requests.find((r) => r.classSessionId === input.session.id) ?? requests[0];

  return prisma.rescheduleRequest.findUniqueOrThrow({
    where: { id: own.id },
    include: requestInclude,
  });
}
