import "server-only";

import { ClassSessionStatus, TeacherApprovalStatus } from "@prisma/client";

import { getInterviewJoinWindow } from "@/features/shared/utils/interviewWindow";
import { rankOrganizers } from "@/features/shared/utils/meetOrganizerPool";
import {
  createMeetSpace,
  ensureMeetCoHost,
  getMeetOrganizers,
  isGoogleMeetEnabled,
} from "@/lib/googleMeet";
import { INTERVIEW_POLICY } from "@/lib/platformConfig";
import { formatPlatformTime } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";

/**
 * The Google Meet room of a teacher interview.
 *
 * Same idea as a class room (`sessionMeeting.service.ts`): created lazily
 * on the first Join, behind `GOOGLE_MEET_ENABLED`, spread over the
 * Workspace organizer pool. Differences:
 *  - the link is only handed out inside the join window (10 min before the
 *    interview until `joinClosesMinutesAfter` after it), checked on the
 *    SERVER clock, for the Teacher and for Admin alike;
 *  - the Admin who joins is made a co-host (the organizer is a service
 *    account, so without this nobody has host controls); the Teacher joins
 *    as a normal participant;
 *  - Admin rescheduling or cancelling the interview deletes the room, so an
 *    old link stops being handed out and the new time gets a fresh room.
 */

export type InterviewJoinFailureCode =
  | "MEET_DISABLED"
  | "NOT_FOUND"
  | "NO_INTERVIEW"
  | "NOT_OPEN"
  | "CLOSED"
  | "ROOM_FAILED";

export type InterviewJoinResult =
  | {
      ok: true;
      meetingUri: string;
      /** Admin only: true when Meet confirmed them as co-host. null for the Teacher. */
      hostConfirmed: boolean | null;
    }
  | { ok: false; status: number; code: InterviewJoinFailureCode; error: string };

export interface InterviewJoinOptions {
  /** Set for Admin: this email is made a co-host of the room. */
  hostEmail?: string | null;
}

function fail(
  status: number,
  code: InterviewJoinFailureCode,
  error: string,
): InterviewJoinResult {
  return { ok: false, status, code, error };
}

/** Organizers best-first: a free account (no overlapping room) beats a busy one, then least recently used. */
async function rankInterviewOrganizers(teacherId: string, scheduledAt: Date): Promise<string[]> {
  const organizers = getMeetOrganizers();

  if (organizers.length <= 1) return organizers;

  const lengthMs = INTERVIEW_POLICY.assumedLengthMinutes * 60_000;
  const start = scheduledAt;
  const end = new Date(scheduledAt.getTime() + lengthMs);

  const [classRows, interviewRows, classUsage, interviewUsage] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        status: ClassSessionStatus.SCHEDULED,
        meetingUri: { not: null },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { meetOrganizerEmail: true },
    }),
    prisma.teacherInterviewMeeting.findMany({
      where: {
        teacherId: { not: teacherId },
        teacher: {
          interviewScheduledAt: { gt: new Date(start.getTime() - lengthMs), lt: end },
        },
      },
      select: { organizerEmail: true },
    }),
    prisma.classSession.groupBy({
      by: ["meetOrganizerEmail"],
      where: { meetOrganizerEmail: { in: organizers } },
      _max: { meetOrganizerAssignedAt: true },
    }),
    prisma.teacherInterviewMeeting.groupBy({
      by: ["organizerEmail"],
      where: { organizerEmail: { in: organizers } },
      _max: { createdAt: true },
    }),
  ]);

  const busy = new Set<string>([
    // Rooms from before the pool have no stored owner: they belong to the first organizer.
    ...(classRows as Array<{ meetOrganizerEmail: string | null }>).map((row) =>
      (row.meetOrganizerEmail ?? organizers[0]).toLowerCase(),
    ),
    ...(interviewRows as Array<{ organizerEmail: string }>).map((row) =>
      row.organizerEmail.toLowerCase(),
    ),
  ]);

  const lastUsedMs = new Map<string, number>();
  const remember = (email: string | null, at: Date | null) => {
    if (!email || !at) return;

    lastUsedMs.set(email, Math.max(lastUsedMs.get(email) ?? 0, at.getTime()));
  };

  for (const row of classUsage as Array<{
    meetOrganizerEmail: string | null;
    _max: { meetOrganizerAssignedAt: Date | null };
  }>) {
    remember(row.meetOrganizerEmail, row._max.meetOrganizerAssignedAt);
  }

  for (const row of interviewUsage as Array<{
    organizerEmail: string;
    _max: { createdAt: Date | null };
  }>) {
    remember(row.organizerEmail, row._max.createdAt);
  }

  return rankOrganizers({ organizers, busy, lastUsedMs });
}

/** Creates the Meet space and stores it. If two joins race, the first one wins. */
async function ensureInterviewRoom(teacherId: string, scheduledAt: Date) {
  const existing = await prisma.teacherInterviewMeeting.findUnique({ where: { teacherId } });

  if (existing) return existing;

  const candidates = await rankInterviewOrganizers(teacherId, scheduledAt);

  if (candidates.length === 0) {
    throw new Error("Google Meet is enabled but no organizer account is configured.");
  }

  let space: Awaited<ReturnType<typeof createMeetSpace>> | null = null;
  let organizer = candidates[0];
  let lastError: unknown = null;

  // Preferred account first; if Google refuses it, fall over to the next.
  for (const candidate of candidates) {
    try {
      space = await createMeetSpace(candidate);
      organizer = candidate;
      break;
    } catch (err) {
      lastError = err;
      console.warn(
        `Interview Meet room creation failed with organizer ${candidate} for teacher ${teacherId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (!space) throw lastError ?? new Error("No Meet organizer could create a room.");

  await prisma.teacherInterviewMeeting.createMany({
    data: [
      {
        teacherId,
        meetSpaceName: space.name,
        meetingUri: space.meetingUri,
        organizerEmail: organizer,
      },
    ],
    skipDuplicates: true,
  });

  const kept = await prisma.teacherInterviewMeeting.findUnique({ where: { teacherId } });

  if (!kept) throw new Error("The interview room could not be saved.");

  return kept;
}

/**
 * Returns the interview's Meet link if (and only if) the join window is
 * open right now. Never throws: every failure is a typed result the route
 * turns into an HTTP status. Used by both the Teacher and Admin routes.
 */
export async function getInterviewJoinLink(
  teacherId: string,
  options: InterviewJoinOptions = {},
  now: Date = new Date(),
): Promise<InterviewJoinResult> {
  if (!isGoogleMeetEnabled()) {
    return fail(503, "MEET_DISABLED", "Video interviews are not switched on yet.");
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, approvalStatus: true, interviewScheduledAt: true },
    });

    if (!teacher) return fail(404, "NOT_FOUND", "Teacher not found.");

    if (
      teacher.approvalStatus !== TeacherApprovalStatus.PENDING ||
      !teacher.interviewScheduledAt
    ) {
      return fail(409, "NO_INTERVIEW", "No interview is scheduled.");
    }

    const window = getInterviewJoinWindow(teacher.interviewScheduledAt, now);

    if (window.state === "NOT_YET" && window.opensAt) {
      return fail(
        409,
        "NOT_OPEN",
        `The interview link opens at ${formatPlatformTime(window.opensAt, true)} (IST), ${INTERVIEW_POLICY.joinOpensMinutesBefore} minutes before the interview.`,
      );
    }

    if (window.state !== "OPEN") {
      return fail(409, "CLOSED", "The interview window has ended.");
    }

    const room = await ensureInterviewRoom(teacher.id, teacher.interviewScheduledAt);

    let hostConfirmed: boolean | null = null;

    const hostEmail = options.hostEmail?.trim();

    if (hostEmail) {
      // Never throws. A failure is shown as a warning, it does not block the join.
      const result = await ensureMeetCoHost(room.meetSpaceName, hostEmail, room.organizerEmail);

      hostConfirmed = result.confirmed;

      if (!result.confirmed) {
        console.warn(
          `Interview Meet co-host NOT confirmed for teacher ${teacher.id} (${hostEmail}): ${result.error}`,
        );
      }
    }

    return { ok: true, meetingUri: room.meetingUri, hostConfirmed };
  } catch (err) {
    console.error(
      `Interview Meet join failed for teacher ${teacherId}:`,
      err instanceof Error ? err.message : err,
    );

    return fail(502, "ROOM_FAILED", "Could not open the interview room. Please try again in a moment.");
  }
}

/** Forget the room (Admin rescheduled or cancelled). The next unlock makes a fresh one. */
export async function clearInterviewMeeting(teacherId: string): Promise<void> {
  await prisma.teacherInterviewMeeting.deleteMany({ where: { teacherId } });
}
