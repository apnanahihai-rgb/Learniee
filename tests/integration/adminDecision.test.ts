import { beforeAll, describe, expect, it } from "vitest";
import { applySessionDecision } from "@/features/shared/server/sessionReview/decision";
import { closeCycleIfDue } from "@/features/shared/server/cycleClose/close";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose/release";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const admin = { sub: "admin-test", name: "Test Admin", email: "admin@test.local" };
const REASON = "Checked the details, decision recorded";

/** Session that both joined but overlapped < 50%: waiting for Admin. */
async function needsReviewSession() {
  const f = await createSessionFixture({});
  const now = new Date();
  await prisma.classSession.update({
    where: { id: f.session.id },
    data: {
      status: "NEEDS_REVIEW",
      teacherStartedAt: f.startsAt,
      studentJoinedAt: new Date(f.startsAt.getTime() + 50 * 60_000),
      teacherEndedAt: f.endsAt,
      resolvedAt: now,
      overlapSeconds: 600,
    },
  });
  return f;
}

beforeAll(async () => {
  await resetDb();
});

describe("Admin decision", () => {
  it("NEEDS_REVIEW -> COMPLETED: status changes, audit row written, session settled", async () => {
    const f = await needsReviewSession();
    await applySessionDecision({
      sessionId: f.session.id,
      toStatus: "COMPLETED",
      expectedStatus: "NEEDS_REVIEW",
      reason: REASON,
      admin,
    });
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("COMPLETED");
    expect(s.settledAt).not.toBeNull();
    const rows = await prisma.sessionOutcomeDecision.findMany({ where: { classSessionId: f.session.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("DECISION");
    expect(rows[0].fromStatus).toBe("NEEDS_REVIEW");
    expect(rows[0].toStatus).toBe("COMPLETED");
    expect(rows[0].decidedBySub).toBe("admin-test");
  });

  it("NEEDS_REVIEW -> TEACHER_NO_SHOW: one strike and one make-up", async () => {
    const f = await needsReviewSession();
    await applySessionDecision({
      sessionId: f.session.id,
      toStatus: "TEACHER_NO_SHOW",
      expectedStatus: "NEEDS_REVIEW",
      reason: REASON,
      admin,
    });
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(1);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(1);
  });

  it("refuses a too-short reason and changes nothing", async () => {
    const f = await needsReviewSession();
    await expect(
      applySessionDecision({
        sessionId: f.session.id,
        toStatus: "COMPLETED",
        expectedStatus: "NEEDS_REVIEW",
        reason: "no",
        admin,
      }),
    ).rejects.toThrow();
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("NEEDS_REVIEW");
    expect(await prisma.sessionOutcomeDecision.count({ where: { classSessionId: f.session.id } })).toBe(0);
  });

  it("refuses a stale page (expectedStatus does not match)", async () => {
    const f = await needsReviewSession();
    await expect(
      applySessionDecision({
        sessionId: f.session.id,
        toStatus: "COMPLETED",
        expectedStatus: "COMPLETED",
        reason: REASON,
        admin,
      }),
    ).rejects.toThrow();
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("NEEDS_REVIEW");
  });
});

describe("Admin override on a closed cycle reconciles the ledger row", () => {
  it("4 completed paid 2000; overriding one to CANCELLED updates the row to 1500 (3 counted)", async () => {
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
    await prisma.classSession.update({ where: { id: f.session.id }, data: { ...done(f.startsAt), confirmation: "ADMIN_DECIDED", settledAt: now } });
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
    const before = await prisma.tuitionLedgerEntry.findFirstOrThrow({ where: { enrollmentId: f.enrollment.id } });
    expect(Number(before.monthlyRate)).toBe(2000);

    await applySessionDecision({
      sessionId: f.session.id,
      toStatus: "CANCELLED",
      expectedStatus: "COMPLETED",
      reason: REASON,
      admin,
    });

    const rows = await prisma.tuitionLedgerEntry.findMany({ where: { enrollmentId: f.enrollment.id } });
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].monthlyRate)).toBe(1500);
    expect(Number(rows[0].monthlyTeacherPay)).toBe(1050);
    expect(Number(rows[0].profits)).toBe(450);
    expect(rows[0].sessionsCompleted).toBe(3);
    const audit = await prisma.sessionOutcomeDecision.findMany({ where: { classSessionId: f.session.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0].kind).toBe("OVERRIDE");
  });
});