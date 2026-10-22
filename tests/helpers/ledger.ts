import { closeCycleIfDue } from "@/features/shared/server/cycleClose/close";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose/release";
import { prisma } from "@/lib/prisma";
import { createSessionFixture } from "./db";

const DAY = 86_400_000;
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** A real ledger row, made the real way: 4 completed sessions -> close -> release. */
export async function createLedgerEntry() {
  const f = await createSessionFixture({});
  const now = new Date();
  const done = (startsAt: Date) => ({
    status: "COMPLETED" as const,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    scheduledDate: utcMidnight(startsAt),
    completedAt: now,
    resolvedAt: now,
    followUpAppliedAt: now,
  });
  await prisma.classSession.update({ where: { id: f.session.id }, data: done(f.startsAt) });
  for (let i = 1; i < 4; i++) {
    await prisma.classSession.create({
      data: {
        enrollmentId: f.enrollment.id,
        teacherId: f.teacher.id,
        studentId: f.student.id,
        parentId: f.parent.id,
        scheduledTime: "10:00",
        cycleId: f.cycle.id,
        sessionNumber: i + 1,
        lengthMinutes: 60,
        ...done(new Date(f.startsAt.getTime() - i * DAY)),
      },
    });
  }
  await closeCycleIfDue(f.cycle.id);
  await releaseClosedCyclePayout(f.cycle.id, new Date(Date.now() + 49 * 3_600_000));
  const entry = await prisma.tuitionLedgerEntry.findFirstOrThrow({ where: { enrollmentId: f.enrollment.id } });
  return { ...f, entry };
}