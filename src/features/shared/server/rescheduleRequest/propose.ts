import {
    notifyReschedulePropose
} from "@/features/shared/server/notificationTriggers.service";
import { cancelSession } from "@/features/shared/server/sessionFlow.service";
import { hasCancelNotice } from "@/features/shared/utils/sessionOutcome";
import {
    calendarDateToDate,
    parseDateKey
} from "@/lib/platformTime";
import { SESSION_POLICY } from "@/lib/platformConfig";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestedBy,
    RescheduleRequestStatus,
} from "@prisma/client";
import "server-only";
import { ActorRole, assertCycleSlotAllowed, assertLegacyRescheduleNotice, assertNotOnTeacherLeave, assertUnderRescheduleCap, assertValidTime, isCycleModelSession, parseDateOnly, PENDING_STATUSES, requestInclude, RescheduleRequestError, startOfDay } from './base';

/**
 * Loads the target ClassSession and checks it belongs to the actor
 * and is still SCHEDULED (a completed/cancelled class can't be
 * rescheduled — reschedule an upcoming one, or if it's already
 * cancelled/done there's nothing to move).
 */
async function loadReschedulableSession(sessionId: string, actorRole: ActorRole, actorId: string) {
  const session = await prisma.classSession.findFirst({
    where:
      actorRole === "TEACHER"
        ? { id: sessionId, teacherId: actorId }
        : { id: sessionId, parentId: actorId },
  });

  if (!session) {
    throw new RescheduleRequestError(
      "Class session not found, or doesn't belong to you.",
      404,
    );
  }

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new RescheduleRequestError(
      `This class is already marked ${session.status.toLowerCase()} and can't be rescheduled.`,
      409,
    );
  }

  return session;
}
type LateCheckSession = {
  cycleId: string | null;
  startsAt: Date | null;
  teacherStartedAt: Date | null;
  studentJoinedAt: Date | null;
};
/** True when a teacher's reschedule ask is really a late cancel (Phase 2.4). */
function isLateTeacherReschedule(actorRole: ActorRole, session: LateCheckSession, now: Date) {
  return (
    actorRole === "TEACHER" &&
    session.cycleId !== null &&
    session.startsAt !== null &&
    session.teacherStartedAt === null &&
    session.studentJoinedAt === null &&
    now < session.startsAt &&
    !hasCancelNotice(session.startsAt, now)
  );
}

/**
 * Phase 2.4: the teacher confirmed a reschedule under 4 hours is a
 * cancel. Runs the normal teacher cancel (make-up + strike, pending
 * requests closed), with the reschedule ask recorded as the reason.
 * Only valid while the late-reschedule rule still applies, so this
 * can't be used to cancel a class that has 4+ hours of notice by
 * accident through a stale page.
 */
export async function cancelForLateReschedule(input: {
  sessionId: string;
  teacherId: string;
  reason?: string | null;
}) {
  const session = await loadReschedulableSession(input.sessionId, "TEACHER", input.teacherId);

  if (!isLateTeacherReschedule("TEACHER", session, new Date())) {
    throw new RescheduleRequestError(
      "This class can be rescheduled normally now. Please send a reschedule request instead.",
      409,
    );
  }

  const note = input.reason?.trim();

  return cancelSession(
    session.id,
    { role: "TEACHER", id: input.teacherId },
    `Late reschedule request (under ${SESSION_POLICY.cancelNoticeHours}h), treated as a cancel${
      note ? `: ${note}` : "."
    }`,
  );
}

export interface ProposeRescheduleInput {
  sessionId: string;
  actorRole: ActorRole;
  actorId: string; // teacherId or parentId, matching actorRole
  proposedDate: string;
  proposedTime?: string | null;
  reason?: string | null;
}
/**
 * Either party proposes moving a SCHEDULED class to a new
 * date/time. Only one pending request per session at a time — a
 * second proposal before the first is resolved is rejected outright
 * rather than silently superseding it, so the other side never has
 * two conflicting asks to juggle.
 */
export async function proposeReschedule(input: ProposeRescheduleInput) {
  const session = await loadReschedulableSession(
    input.sessionId,
    input.actorRole,
    input.actorId,
  );

  // Phase 2.4: a teacher asking to move a class that is under 4 hours
  // away is really cancelling it, so it is treated as a teacher cancel
  // (make-up + strike). The teacher must confirm that first.
  if (isLateTeacherReschedule(input.actorRole, session, new Date())) {
    throw new RescheduleRequestError(
      `This class starts in under ${SESSION_POLICY.cancelNoticeHours} hours, so it can't be rescheduled. Continuing will cancel it instead and record a strike against you.`,
      409,
      "LATE_TEACHER_RESCHEDULE",
    );
  }

  const existingPending = await prisma.rescheduleRequest.findFirst({
    where: { classSessionId: session.id, status: { in: PENDING_STATUSES } },
  });

  if (existingPending) {
    throw new RescheduleRequestError(
      "This class already has a pending reschedule request awaiting a response.",
      409,
    );
  }

  await assertUnderRescheduleCap(session.id);

  let proposedDate: Date;
  const proposedTime = assertValidTime(input.proposedTime);

  if (isCycleModelSession(session)) {
    // Cycle model: calendar dates are platform-timezone dates stored
    // as UTC midnight (same as the session's own `scheduledDate`), and
    // the 4-hour and cycle-deadline rules apply.
    const dateKey = parseDateKey(input.proposedDate.trim().slice(0, 10));

    if (!dateKey) {
      throw new RescheduleRequestError("Invalid proposed date.");
    }

    await assertCycleSlotAllowed(session, dateKey, proposedTime, new Date());

    proposedDate = calendarDateToDate(dateKey);
  } else {
    proposedDate = parseDateOnly(input.proposedDate);

    // Phase 2.5: legacy sessions get the same 4-hour notice rule.
    assertLegacyRescheduleNotice(session, new Date());

    const today = startOfDay(new Date());
    if (proposedDate < today) {
      throw new RescheduleRequestError("Proposed date can't be in the past.");
    }
  }

  await assertNotOnTeacherLeave(session.teacherId, proposedDate);

  const requestedBy: RescheduleRequestedBy =
    input.actorRole === "PARENT" ? RescheduleRequestedBy.PARENT : RescheduleRequestedBy.TEACHER;

  const status: RescheduleRequestStatus =
    requestedBy === RescheduleRequestedBy.PARENT
      ? RescheduleRequestStatus.PENDING_TEACHER_APPROVAL
      : RescheduleRequestStatus.PENDING_PARENT_APPROVAL;

  const reason = input.reason?.trim() || null;

  const created = await prisma.rescheduleRequest.create({
    data: {
      classSessionId: session.id,
      enrollmentId: session.enrollmentId,
      teacherId: session.teacherId,
      parentId: session.parentId,
      requestedBy,
      originalScheduledDate: session.scheduledDate,
      originalScheduledTime: session.scheduledTime,
      proposedDate,
      proposedTime,
      reason,
      status,
    },
    include: requestInclude,
  });

  await notifyReschedulePropose(created.id);

  return created;
}
