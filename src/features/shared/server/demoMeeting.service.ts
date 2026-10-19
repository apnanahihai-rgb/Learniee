import "server-only";

import { ClassSessionStatus, DemoBookingStatus } from "@prisma/client";

import { findBusyDemoOrganizers } from "@/features/shared/server/demoOrganizerBusy";
import { getDemoJoinWindow } from "@/features/shared/utils/demoWindow";
import { rankOrganizers } from "@/features/shared/utils/meetOrganizerPool";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import {
  createMeetSpace,
  ensureMeetCoHost,
  getMeetOrganizers,
  isGoogleMeetEnabled,
} from "@/lib/googleMeet";
import { DEMO_POLICY, INTERVIEW_POLICY } from "@/lib/platformConfig";
import { formatPlatformTime } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";

/**
 * The Google Meet room of a (free or paid) demo.
 *
 * Same idea as a class room (`sessionMeeting.service.ts`): created lazily on
 * the first join, behind `GOOGLE_MEET_ENABLED`, spread over the Workspace
 * organizer pool. Differences:
 *  - the link is only handed out inside the join window (10 min before the
 *    demo until 30 min after its scheduled end), checked on the SERVER clock,
 *    for the Parent and the Teacher alike, and never appears in a list API;
 *  - only a CONFIRMED demo has a room (a pending payment or a cancelled demo
 *    does not);
 *  - the Teacher is made a co-host as soon as the room exists, even when the
 *    Parent is the first one in, so the Teacher has host controls on arrival.
 *    A co-host problem never blocks the join: it is reported back as a warning.
 * A Meet outage never throws: every failure is a typed result the route turns
 * into an HTTP status, and the page offers a retry.
 */

export type DemoJoinRole = "PARENT" | "TEACHER";

export type DemoJoinFailureCode =
  | "MEET_DISABLED"
  | "NOT_FOUND"
  | "NOT_CONFIRMED"
  | "NOT_OPEN"
  | "CLOSED"
  | "ROOM_FAILED";

export type DemoJoinResult =
  | {
      ok: true;
      meetingUri: string;
      /** Teacher only: true when Meet confirmed them as co-host. null for the Parent. */
      hostConfirmed: boolean | null;
    }
  | { ok: false; status: number; code: DemoJoinFailureCode; error: string };

function fail(status: number, code: DemoJoinFailureCode, error: string): DemoJoinResult {
  return { ok: false, status, code, error };
}

function sameEmail(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

const bookingSelect = {
  id: true,
  status: true,
  scheduledAt: true,
  parentId: true,
  teacherId: true,
  meetSpaceName: true,
  meetingUri: true,
  meetOrganizerEmail: true,
  meetCohostEmail: true,
  course: { select: { duration: true } },
  teacher: { select: { email: true } },
} as const;

type BookingRow = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

function loadBooking(id: string) {
  return prisma.demoBooking.findUnique({ where: { id }, select: bookingSelect });
}

/** Organizers best-first: a free account (no overlapping room) beats a busy one, then least recently used. */
async function rankDemoOrganizers(bookingId: string, scheduledAt: Date): Promise<string[]> {
  const organizers = getMeetOrganizers();

  if (organizers.length <= 1) return organizers;

  const lengthMs = DEMO_POLICY.assumedLengthMinutes * 60_000;
  const start = scheduledAt;
  const end = new Date(scheduledAt.getTime() + lengthMs);
  const defaultOrganizer = organizers[0];

  const [classRows, interviewRows, demoBusy, classUsage, demoUsage] = await Promise.all([
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
        teacher: {
          interviewScheduledAt: {
            gt: new Date(start.getTime() - INTERVIEW_POLICY.assumedLengthMinutes * 60_000),
            lt: end,
          },
        },
      },
      select: { organizerEmail: true },
    }),
    findBusyDemoOrganizers(prisma, start, end, defaultOrganizer, bookingId),
    prisma.classSession.groupBy({
      by: ["meetOrganizerEmail"],
      where: { meetOrganizerEmail: { in: organizers } },
      _max: { meetOrganizerAssignedAt: true },
    }),
    prisma.demoBooking.groupBy({
      by: ["meetOrganizerEmail"],
      where: { meetOrganizerEmail: { in: organizers } },
      _max: { meetOrganizerAssignedAt: true },
    }),
  ]);

  const busy = new Set<string>([
    ...(classRows as Array<{ meetOrganizerEmail: string | null }>).map((row) =>
      (row.meetOrganizerEmail ?? defaultOrganizer).toLowerCase(),
    ),
    ...(interviewRows as Array<{ organizerEmail: string }>).map((row) =>
      row.organizerEmail.toLowerCase(),
    ),
    ...demoBusy,
  ]);

  const lastUsedMs = new Map<string, number>();

  for (const row of [...classUsage, ...demoUsage] as Array<{
    meetOrganizerEmail: string | null;
    _max: { meetOrganizerAssignedAt: Date | null };
  }>) {
    const at = row._max.meetOrganizerAssignedAt;

    if (row.meetOrganizerEmail && at) {
      lastUsedMs.set(
        row.meetOrganizerEmail,
        Math.max(lastUsedMs.get(row.meetOrganizerEmail) ?? 0, at.getTime()),
      );
    }
  }

  return rankOrganizers({ organizers, busy, lastUsedMs });
}

/** Makes sure the teacher is a confirmed co-host of the demo's room. Never throws. */
async function syncDemoCohost(booking: BookingRow): Promise<boolean> {
  if (!booking.meetSpaceName) return false;

  if (sameEmail(booking.meetCohostEmail, booking.teacher.email)) return true;

  const organizer = booking.meetOrganizerEmail ?? getMeetOrganizers()[0] ?? null;
  const teacherEmail = booking.teacher.email?.trim() || null;

  if (!organizer || !teacherEmail) return false;

  try {
    const result = await ensureMeetCoHost(booking.meetSpaceName, teacherEmail, organizer);

    await prisma.demoBooking.update({
      where: { id: booking.id },
      data: result.confirmed
        ? { meetCohostEmail: teacherEmail, meetCohostConfirmedAt: new Date() }
        : // A changed email must not keep an old confirmation alive.
          { meetCohostEmail: null, meetCohostConfirmedAt: null },
    });

    if (!result.confirmed) {
      console.warn(
        `Demo Meet co-host NOT confirmed for booking ${booking.id} (${teacherEmail}): ${result.error}`,
      );
    }

    return result.confirmed;
  } catch (err) {
    console.error(
      `Demo Meet co-host sync failed for booking ${booking.id}:`,
      err instanceof Error ? err.message : err,
    );

    return false;
  }
}

/** Creates the Meet space and stores it. If two joins race, the first one wins. */
async function ensureDemoRoom(booking: BookingRow, scheduledAt: Date): Promise<BookingRow | null> {
  if (booking.meetingUri) return booking;

  const candidates = await rankDemoOrganizers(booking.id, scheduledAt);

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
        `Demo Meet room creation failed with organizer ${candidate} for booking ${booking.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (!space) throw lastError ?? new Error("No Meet organizer could create a room.");

  // Conditional write: whoever gets here first keeps their room, the other
  // adopts it (the extra empty space is harmless).
  await prisma.demoBooking.updateMany({
    where: { id: booking.id, meetingUri: null },
    data: {
      meetSpaceName: space.name,
      meetingUri: space.meetingUri,
      meetOrganizerEmail: organizer,
      meetOrganizerAssignedAt: new Date(),
    },
  });

  return loadBooking(booking.id);
}

/**
 * Returns the demo's Meet link if (and only if) the join window is open right
 * now and the caller is the demo's own Parent or Teacher. Never throws.
 */
export async function getDemoJoinLink(
  bookingId: string,
  actor: { role: DemoJoinRole; id: string },
  now: Date = new Date(),
): Promise<DemoJoinResult> {
  if (!isGoogleMeetEnabled()) {
    return fail(503, "MEET_DISABLED", "Video demos are not switched on yet.");
  }

  try {
    const booking = await loadBooking(bookingId);

    // Someone else's demo looks exactly like a missing one.
    const owns =
      booking !== null &&
      (actor.role === "PARENT" ? booking.parentId === actor.id : booking.teacherId === actor.id);

    if (!booking || !owns) return fail(404, "NOT_FOUND", "Demo not found.");

    if (booking.status !== DemoBookingStatus.CONFIRMED || !booking.scheduledAt) {
      return fail(409, "NOT_CONFIRMED", "This demo is not confirmed, so it has no video room.");
    }

    const window = getDemoJoinWindow(
      booking.scheduledAt,
      sessionLengthForCourse(booking.course.duration),
      now,
    );

    if (window.state === "NOT_YET" && window.opensAt) {
      return fail(
        409,
        "NOT_OPEN",
        `The demo link opens at ${formatPlatformTime(window.opensAt, true)} (IST), ${DEMO_POLICY.joinOpensMinutesBefore} minutes before the demo.`,
      );
    }

    if (window.state !== "OPEN") {
      return fail(409, "CLOSED", "The demo window has ended.");
    }

    const room = await ensureDemoRoom(booking, booking.scheduledAt);

    if (!room?.meetingUri) throw new Error("The demo room could not be saved.");

    // The teacher is a co-host whoever joins first. Never blocks the join.
    const hostConfirmed = await syncDemoCohost(room);

    // First join per side, written once. Best effort.
    await prisma.demoBooking
      .updateMany({
        where:
          actor.role === "TEACHER"
            ? { id: room.id, teacherJoinedAt: null }
            : { id: room.id, parentJoinedAt: null },
        data: actor.role === "TEACHER" ? { teacherJoinedAt: now } : { parentJoinedAt: now },
      })
      .catch((err: unknown) => {
        console.warn(`Demo join stamp failed for booking ${room.id}:`, err);
      });

    return {
      ok: true,
      meetingUri: room.meetingUri,
      hostConfirmed: actor.role === "TEACHER" ? hostConfirmed : null,
    };
  } catch (err) {
    console.error(
      `Demo Meet join failed for booking ${bookingId}:`,
      err instanceof Error ? err.message : err,
    );

    return fail(502, "ROOM_FAILED", "Could not open the demo room. Please try again in a moment.");
  }
}
