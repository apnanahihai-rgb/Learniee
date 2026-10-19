import "server-only";

import { DemoBookingStatus, type Prisma } from "@prisma/client";

import { DEMO_POLICY } from "@/lib/platformConfig";
import type { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Workspace organizer accounts (lower-cased) that already own a DEMO room
 * overlapping the window [start, end). A demo's real end isn't stored, so a
 * demo counts as `DEMO_POLICY.assumedLengthMinutes` long here. Rooms from
 * before the pool have no stored owner and belong to `defaultOrganizer`.
 *
 * Shared by the class, interview and demo room allocators so a demo room is
 * never handed an account that is busy with a class, and vice versa.
 */
export async function findBusyDemoOrganizers(
  db: Db,
  start: Date,
  end: Date,
  defaultOrganizer: string,
  excludeBookingId?: string,
): Promise<string[]> {
  const lengthMs = DEMO_POLICY.assumedLengthMinutes * 60_000;

  const rows = await db.demoBooking.findMany({
    where: {
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      status: DemoBookingStatus.CONFIRMED,
      meetingUri: { not: null },
      scheduledAt: { gt: new Date(start.getTime() - lengthMs), lt: end },
    },
    select: { meetOrganizerEmail: true },
  });

  return rows.map((row: { meetOrganizerEmail: string | null }) =>
    (row.meetOrganizerEmail ?? defaultOrganizer).toLowerCase(),
  );
}
