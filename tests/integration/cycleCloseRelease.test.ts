import { beforeAll, describe, expect, it } from "vitest";
import { closeCycleIfDue } from "@/features/shared/server/cycleClose/close";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose/release";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

type St = "COMPLETED" | "CANCELLED" | "TEACHER_NO_SHOW" | "SCHEDULED";

const DAY = 86_400_000;
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** A 4-session cycle whose sessions have the given statuses (final ones already have their follow-up applied). */
async function buildCycle(statuses: [St, St, St, St]) {
  const f = await createSessionFixture({});
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const status = statuses[i];
    const future = status === "SCHEDULED";
    const startsAt = future ? new Date(now.getTime() + DAY) : new Date(f.startsAt.getTime() - i * DAY);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const data = {
      status,
      startsAt,
      endsAt,
      scheduledDate: utcMidnight(startsAt),
      ...(future ? {} : { followUpAppliedAt: now }),
      ...(status === "COMPLETED" ? { completedAt: now, resolvedAt: now } : {}),
      ...(status === "TEACHER_NO_SHOW" ? { resolvedAt: now } : {}),
      ...(status === "CANCELLED" ? { cancelledAt: now, cancelledByRole: "PARENT" as const } : {}),
    };
    if (i === 0) {
      await prisma.classSession.update({ where: { id: f.session.id }, data });
    } else {
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
          ...data,
        },
      });
    }
  }
  return f;
}

const after49h = () => new Date(Date.now() + 49 * 3_600_000);

beforeAll(async () => {
  await resetDb();
});

describe("cycle close", () => {
  it("does not close while a session is still to come", async () => {
    const f = await buildCycle(["COMPLETED", "COMPLETED", "COMPLETED", "SCHEDULED"]);
    expect((await closeCycleIfDue(f.cycle.id)).closed).toBe(false);
    const c = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(c.status).toBe("OPEN");
  });

  it("closes once, with counted and forfeited totals", async () => {
    const f = await buildCycle(["COMPLETED", "COMPLETED", "CANCELLED", "TEACHER_NO_SHOW"]);
    expect((await closeCycleIfDue(f.cycle.id)).closed).toBe(true);
    expect((await closeCycleIfDue(f.cycle.id)).closed).toBe(false);
    const c = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(c.status).toBe("CLOSED");
    expect(c.closedAt).not.toBeNull();
    expect(c.countedSessionCount).toBe(2);
    expect(c.forfeitedSessionCount).toBe(2);
  });
});

describe("payout release", () => {
  it("waits while the 48 h confirmation window is open (no ledger row)", async () => {
    const f = await buildCycle(["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED"]);
    await closeCycleIfDue(f.cycle.id);
    const r = await releaseClosedCyclePayout(f.cycle.id);
    expect(r.released).toBe(false);
    expect(await prisma.tuitionLedgerEntry.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
    const c = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(c.payoutReleasedAt).toBeNull();
  });

  it("after 48 h: one ledger row, 70/30 of rate x counted; releasing again adds nothing", async () => {
    const f = await buildCycle(["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED"]);
    await closeCycleIfDue(f.cycle.id);
    const r = await releaseClosedCyclePayout(f.cycle.id, after49h());
    expect(r).toEqual({ released: true, ledgerCreated: true });
    await releaseClosedCyclePayout(f.cycle.id, after49h());
    const rows = await prisma.tuitionLedgerEntry.findMany({ where: { enrollmentId: f.enrollment.id } });
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].monthlyRate)).toBe(2000);
    expect(Number(rows[0].monthlyTeacherPay)).toBe(1400);
    expect(Number(rows[0].profits)).toBe(600);
    expect(rows[0].sessionsCompleted).toBe(4);
    expect(rows[0].cycleNumber).toBe(1);
  });

  it("partly counted cycle pays only counted sessions (2 of 4 -> 1000: 700 / 300)", async () => {
    const f = await buildCycle(["COMPLETED", "COMPLETED", "CANCELLED", "TEACHER_NO_SHOW"]);
    await closeCycleIfDue(f.cycle.id);
    await releaseClosedCyclePayout(f.cycle.id, after49h());
    const rows = await prisma.tuitionLedgerEntry.findMany({ where: { enrollmentId: f.enrollment.id } });
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].monthlyRate)).toBe(1000);
    expect(Number(rows[0].monthlyTeacherPay)).toBe(700);
    expect(Number(rows[0].profits)).toBe(300);
  });

  it("nothing counted: cycle is released but no ledger row", async () => {
    const f = await buildCycle(["CANCELLED", "CANCELLED", "CANCELLED", "CANCELLED"]);
    await closeCycleIfDue(f.cycle.id);
    await releaseClosedCyclePayout(f.cycle.id, after49h());
    const c = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(c.payoutReleasedAt).not.toBeNull();
    expect(await prisma.tuitionLedgerEntry.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });
});