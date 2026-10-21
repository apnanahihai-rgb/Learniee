import { beforeAll, describe, expect, it } from "vitest";
import { resolveSession } from "@/features/shared/server/sessionResolve/resolve";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const min = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

beforeAll(async () => {
  await resetDb();
});

describe("3B resolveSession outcomes", () => {
  it("both joined, overlap >= 50% -> COMPLETED", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { teacherStartedAt: f.startsAt, studentJoinedAt: min(f.startsAt, 5), teacherEndedAt: f.endsAt },
    });
    const r = await resolveSession(f.session.id);
    expect(r).toEqual({ changed: true, status: "COMPLETED" });
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.completedByRole).toBe("SYSTEM");
    expect(s.countersAppliedAt).not.toBeNull();
  });

  it("teacher only -> STUDENT_NO_SHOW (no make-up, no strike)", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { teacherStartedAt: f.startsAt, teacherEndedAt: min(f.startsAt, 15) },
    });
    const r = await resolveSession(f.session.id);
    expect(r.status).toBe("STUDENT_NO_SHOW");
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(0);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(0);
  });

  it("student only -> TEACHER_NO_SHOW", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { studentJoinedAt: min(f.startsAt, 2) },
    });
    expect((await resolveSession(f.session.id)).status).toBe("TEACHER_NO_SHOW");
  });

  it("nobody -> CANCELLED by SYSTEM", async () => {
    const f = await createSessionFixture({});
    expect((await resolveSession(f.session.id)).status).toBe("CANCELLED");
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.cancelledByRole).toBe("SYSTEM");
  });

  it("both joined, overlap < 50% -> NEEDS_REVIEW", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { teacherStartedAt: f.startsAt, studentJoinedAt: min(f.startsAt, 50), teacherEndedAt: f.endsAt },
    });
    expect((await resolveSession(f.session.id)).status).toBe("NEEDS_REVIEW");
  });

  it("class not over yet -> nothing changes", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 3_600_000) });
    expect(await resolveSession(f.session.id)).toEqual({ changed: false, status: "SCHEDULED" });
  });

  it("calling twice changes nothing; event times are never overwritten", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { teacherStartedAt: f.startsAt, studentJoinedAt: min(f.startsAt, 3), teacherEndedAt: f.endsAt },
    });
    const first = await resolveSession(f.session.id);
    const before = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    const second = await resolveSession(f.session.id);
    const after = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(after.status).toBe(before.status);
    expect(after.resolvedAt).toEqual(before.resolvedAt);
    expect(after.teacherStartedAt).toEqual(before.teacherStartedAt);
    expect(after.studentJoinedAt).toEqual(before.studentJoinedAt);
    expect(after.teacherEndedAt).toEqual(before.teacherEndedAt);
  });
});

describe("3C follow-ups", () => {
  it("teacher no-show: 1 make-up + 1 strike, still 1 and 1 when run again", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { studentJoinedAt: min(f.startsAt, 2) },
    });
    await resolveSession(f.session.id);
    await runSessionFollowUps(f.session.id);
    await runSessionFollowUps(f.session.id);
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(1);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(1);
  });

  it("make-up lands in the future (>= 4 h ahead) inside the cycle", async () => {
    const f = await createSessionFixture({});
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { studentJoinedAt: min(f.startsAt, 2) },
    });
    await resolveSession(f.session.id);
    const makeup = await prisma.classSession.findFirstOrThrow({ where: { makeupForSessionId: f.session.id } });
    expect(makeup.cycleId).toBe(f.cycle.id);
    expect(makeup.startsAt!.getTime()).toBeGreaterThanOrEqual(Date.now() + 4 * 3_600_000 - 5_000);
    expect(makeup.startsAt!.getTime()).toBeLessThanOrEqual(f.cycle.endDate.getTime() + 86_400_000);
  });

  it("nobody joined: make-up but NO strike", async () => {
    const f = await createSessionFixture({});
    await resolveSession(f.session.id);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(1);
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(0);
  });
});