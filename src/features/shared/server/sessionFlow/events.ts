import { logActivity } from "@/features/shared/server/activityLog.service";
import { findGroupSiblings } from "@/features/shared/server/groupClass.service";
import { getGroupClassStartBlock } from "@/features/shared/server/groupContinue.service";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import {
    ensureSessionMeeting,
    isCohostConfirmed,
} from "@/features/shared/server/sessionMeeting.service";
import { resolveSession } from "@/features/shared/server/sessionResolve.service";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import {
    getSessionActions,
    joinOpensAt,
    parentCancelStatus,
    studentAbsentFrom,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { isGoogleMeetEnabled } from "@/lib/googleMeet";
import {
    formatPlatformTime
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    ClassSessionStatus,
    RescheduleRequestStatus
} from "@prisma/client";
import "server-only";
import { loadAndSettle, PENDING_RESCHEDULE_STATUSES, requireCycleSession, SessionActor, SessionFlowError } from './core';
import { reload, statusLabel, toStateWithGroup } from './state';

/**
 * Group class: copies the teacher's Start onto every other student's session
 * of the same class that hasn't got one yet. Conditional, so it never
 * overwrites a time that was already saved. No-op for an Individual class.
 */
async function startGroupSiblings(
  session: Parameters<typeof findGroupSiblings>[0],
  startedAt: Date,
): Promise<void> {
  const siblings = await findGroupSiblings(session);

  if (siblings.length === 0) return;

  await prisma.classSession.updateMany({
    where: {
      id: { in: siblings.map((s) => s.id) },
      status: ClassSessionStatus.SCHEDULED,
      teacherStartedAt: null,
      teacherEndedAt: null,
    },
    data: { teacherStartedAt: startedAt },
  });
}

/**
 * Teacher taps Start. Opens 10 minutes before the class starts and
 * stays open until its scheduled end. Tapping again keeps the first
 * time — the start time is never overwritten.
 */
export async function startSession(
  sessionId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "TEACHER", id: teacherId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already over (${statusLabel(session.status)}).`,
      409,
    );
  }

  if (session.teacherStartedAt) {
    // Already started: (re)try the Meet room if it's missing, and
    // re-check the co-host if Meet hasn't confirmed it yet. This is
    // also what the teacher's "Retry" button calls.
    // Group class: a student who enrolled after the class started still
    // belongs to the same live class.
    await startGroupSiblings(session, session.teacherStartedAt);

    if (isGoogleMeetEnabled() && (!session.meetingUri || !isCohostConfirmed(session))) {
      await ensureSessionMeeting(session.id);
      return reload(sessionId, actor, now);
    }

    return toStateWithGroup(session, "TEACHER", now);
  }

  const opensAt = joinOpensAt(session.startsAt);

  if (now < opensAt) {
    throw new SessionFlowError(
      `You can start this session from ${formatPlatformTime(opensAt)}, 10 minutes before it begins.`,
      409,
    );
  }

  // Recurring group: the 4th-last class of a batch (and the ones after it)
  // can't be held until the teacher has answered "continue this group?".
  const startBlock = await getGroupClassStartBlock(session);

  if (startBlock) {
    throw new SessionFlowError(startBlock, 409);
  }

  await prisma.classSession.updateMany({
    where: {
      id: session.id,
      status: ClassSessionStatus.SCHEDULED,
      teacherStartedAt: null,
      teacherEndedAt: null,
    },
    data: { teacherStartedAt: now },
  });

  // Group class: one Start opens the class for every student in it, and
  // they all share the one Meet room created below.
  await startGroupSiblings(session, now);

  // Meet only supplies the room; a failure here never blocks the Start.
  // The co-host is re-verified with Google on every first Start, even if
  // the room was already created by an earlier Join.
  await ensureSessionMeeting(session.id, { force: true });

  return reload(sessionId, actor, now);
}
/**
 * Parent taps Join. Same window as Start: from 10 minutes before the
 * start until the scheduled end, enforced here rather than trusted
 * from the button. Tapping again keeps the first time.
 */
export async function joinSession(
  sessionId: string,
  parentId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "PARENT", id: parentId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already over (${statusLabel(session.status)}).`,
      409,
    );
  }

  if (session.studentJoinedAt) {
    // Already joined: only (re)try the Meet room if it's missing.
    if (isGoogleMeetEnabled() && !session.meetingUri) {
      await ensureSessionMeeting(session.id);
      return reload(sessionId, actor, now);
    }

    return toStateWithGroup(session, "PARENT", now);
  }

  if (session.teacherEndedAt) {
    throw new SessionFlowError("The teacher has already ended this session.", 409);
  }

  const opensAt = joinOpensAt(session.startsAt);

  if (now < opensAt) {
    throw new SessionFlowError(
      `You can join this session from ${formatPlatformTime(opensAt)}, 10 minutes before it begins.`,
      409,
    );
  }

  await prisma.classSession.updateMany({
    where: {
      id: session.id,
      status: ClassSessionStatus.SCHEDULED,
      studentJoinedAt: null,
      teacherEndedAt: null,
    },
    data: { studentJoinedAt: now },
  });

  // Meet only supplies the room; a failure here never blocks the Join.
  await ensureSessionMeeting(session.id);

  return reload(sessionId, actor, now);
}
/**
 * Teacher taps End. If the student never joined, that is only
 * possible from 10 minutes after the start ("student absent").
 * Records the end time, then hands the decision to `resolveSession`.
 * Safe to tap twice — the second tap just returns the outcome.
 */
export async function endSession(
  sessionId: string,
  teacherId: string,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const actor: SessionActor = { role: "TEACHER", id: teacherId };
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  // Already decided (a double tap, or the time ran out first): show
  // the outcome instead of an error.
  if (session.status !== ClassSessionStatus.SCHEDULED) {
    return toStateWithGroup(session, "TEACHER", now);
  }

  if (!session.teacherStartedAt) {
    throw new SessionFlowError("Start the session before ending it.", 409);
  }

  // Group class: the teacher ends the one shared class for everyone. It only
  // counts as "nobody came" when no student of the group has joined.
  const siblings = await findGroupSiblings(session);
  const anyStudentJoined =
    session.studentJoinedAt !== null || siblings.some((s) => s.studentJoinedAt !== null);

  if (!anyStudentJoined) {
    const absentFrom = studentAbsentFrom(session.startsAt);

    if (now < absentFrom) {
      throw new SessionFlowError(
        `The student hasn't joined yet. You can end the session as "student absent" from ${formatPlatformTime(absentFrom)}.`,
        409,
      );
    }
  }

  await prisma.classSession.updateMany({
    where: { id: session.id, status: ClassSessionStatus.SCHEDULED, teacherEndedAt: null },
    data: { teacherEndedAt: now },
  });

  await resolveSession(session.id, now);

  if (siblings.length > 0) {
    // A student whose session was added after the Start is in the same class:
    // the teacher was present from the same moment.
    await startGroupSiblings(session, session.teacherStartedAt);

    await prisma.classSession.updateMany({
      where: {
        id: { in: siblings.map((s) => s.id) },
        status: ClassSessionStatus.SCHEDULED,
        teacherEndedAt: null,
      },
      data: { teacherEndedAt: now },
    });

    // One at a time (each takes the cycle lock). A failure on one student
    // never stops the rest; the sweep decides anything left over.
    for (const sibling of siblings) {
      try {
        await resolveSession(sibling.id, now);
      } catch (err) {
        console.error(
          `Group class: couldn't resolve session ${sibling.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return reload(sessionId, actor, now);
}
/**
 * Cancel a session before it starts — the only way a cycle session
 * gets an outcome other than through `resolveSession`:
 *
 *   parent, 4h+ ahead   -> CANCELLED       (does not count)
 *   parent, under 4h    -> CANCELLED_LATE  (still counts, paid)
 *   teacher, any time   -> CANCELLED       (does not count)
 *
 * The follow-ups (make-up / strike) are applied right after, by
 * `runSessionFollowUps` (Part 1C). A session that has started (or
 * that the student has joined) can't be cancelled any more — its
 * outcome comes from the events instead.
 */
export async function cancelSession(
  sessionId: string,
  actor: SessionActor,
  reason: string | null,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const session = requireCycleSession(await loadAndSettle(sessionId, actor, now));

  if (session.status !== ClassSessionStatus.SCHEDULED) {
    throw new SessionFlowError(
      `This session is already ${statusLabel(session.status)} and can't be cancelled.`,
      409,
    );
  }

  const actions = getSessionActions(actor.role, session, now);

  if (!actions.canCancel) {
    throw new SessionFlowError(
      session.teacherStartedAt || session.studentJoinedAt || now >= session.startsAt
        ? "This session has already started, so it can't be cancelled any more."
        : "This session can't be cancelled right now.",
      409,
    );
  }

  const status =
    actor.role === "TEACHER"
      ? ClassSessionStatus.CANCELLED
      : (parentCancelStatus(session.startsAt, now) as ClassSessionStatus);

  const cleanReason = reason?.trim().slice(0, 500) || null;

  // Group class: a TEACHER's cancel is the whole class, so every other
  // student's session of it is cancelled together with this one. A parent's
  // cancel stays their own seat only.
  const groupSiblings = actor.role === "TEACHER" ? await findGroupSiblings(session) : [];

  if (groupSiblings.some((s) => s.studentJoinedAt !== null || s.teacherStartedAt !== null)) {
    throw new SessionFlowError(
      "A student has already joined this group class, so it can't be cancelled any more.",
      409,
    );
  }

  const siblingIds = groupSiblings.map((s) => s.id);

  const cancelData = {
    status,
    cancelledAt: now,
    cancelledByRole: actor.role,
    cancelReason: cleanReason,
  };

  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.classSession.updateMany({
      // Re-checked inside the write so a Start/Join that lands at the
      // same moment can't be overwritten by a cancel.
      where: {
        id: session.id,
        status: ClassSessionStatus.SCHEDULED,
        teacherStartedAt: null,
        studentJoinedAt: null,
      },
      data: cancelData,
    });

    if (result.count === 0) return false;

    if (siblingIds.length > 0) {
      await tx.classSession.updateMany({
        where: {
          id: { in: siblingIds },
          status: ClassSessionStatus.SCHEDULED,
          teacherStartedAt: null,
          studentJoinedAt: null,
        },
        data: cancelData,
      });
    }

    await tx.rescheduleRequest.updateMany({
      where: {
        classSessionId: { in: [session.id, ...siblingIds] },
        status: { in: PENDING_RESCHEDULE_STATUSES },
      },
      data: { status: RescheduleRequestStatus.CANCELLED, respondedAt: now },
    });

    return true;
  });

  if (!changed) {
    throw new SessionFlowError(
      "This session just started or changed, so it can't be cancelled.",
      409,
    );
  }

  await logActivity({
    action: "CLASS_SESSION_OUTCOME",
    actorRole: actor.role,
    actorId: actor.id,
    description: `Class session cancelled by the ${actor.role.toLowerCase()} (${statusLabel(
      status as SessionStatusValue,
    )}).`,
    metadata: {
      sessionId: session.id,
      status,
      reason: cleanReason,
      ...(siblingIds.length > 0 ? { groupSessionIds: siblingIds } : {}),
    },
  });

  // Part 1C: a teacher cancel gets its make-up and strike, a late
  // parent cancel feeds the counters, and the cycle close check runs.
  await runSessionFollowUps(session.id, now);

  // Group class: the other students' sessions run their own follow-up one
  // after another. The first make-up fixes the group's slot and the rest book
  // the same one; the class gets one strike, not one per student.
  for (const siblingId of siblingIds) {
    await runSessionFollowUps(siblingId, now);
  }

  return reload(sessionId, actor, now);
}
