import { beforeAll, describe, expect, it } from "vitest";
import { proposeReschedule } from "@/features/shared/server/rescheduleRequest/propose";
import { respondToReschedule } from "@/features/shared/server/rescheduleRequest/respond";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * DAY);

beforeAll(async () => {
  await resetDb();
});

type F = Awaited<ReturnType<typeof createSessionFixture>>;

const parentPropose = (f: F, date: string) =>
  proposeReschedule({
    sessionId: f.session.id,
    actorRole: "PARENT",
    actorId: f.parent.id,
    proposedDate: date,
    proposedTime: "10:00",
    reason: "Test reschedule",
  });

const teacherApprove = (f: F, requestId: string) =>
  respondToReschedule({
    requestId,
    actorRole: "TEACHER",
    actorId: f.teacher.id,
    decision: "APPROVE",
  });

async function pendingFor(f: F) {
  return prisma.rescheduleRequest.findFirstOrThrow({
    where: { classSessionId: f.session.id },
    orderBy: { createdAt: "desc" },
  });
}

describe("Reschedule", () => {
  it("parent proposes, teacher approves: class moves to the new date", async () => {
    const f = await createSessionFixture({ startsAt: inDays(3) });
    const target = ymd(f.startsAt.getTime() + 2 * DAY);
    await parentPropose(f, target);
    const req = await pendingFor(f);
    expect(req.status).toBe("PENDING_TEACHER_APPROVAL");
    await teacherApprove(f, req.id);

    const done = await prisma.rescheduleRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(done.status).toBe("APPROVED");
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("SCHEDULED");
    expect(s.startsAt!.getTime()).toBeGreaterThan(f.startsAt.getTime() + DAY);
  });

  it("teacher rejects: class stays where it was", async () => {
    const f = await createSessionFixture({ startsAt: inDays(3) });
    await parentPropose(f, ymd(f.startsAt.getTime() + 2 * DAY));
    const req = await pendingFor(f);
    await respondToReschedule({
      requestId: req.id,
      actorRole: "TEACHER",
      actorId: f.teacher.id,
      decision: "REJECT",
      responseNote: "Not possible",
    });
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.startsAt!.getTime()).toBe(f.startsAt.getTime());
    expect((await pendingFor(f)).status).toBe("REJECTED");
  });

  it("class less than 4 h away: proposal refused", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * 3_600_000) });
    await expect(parentPropose(f, ymd(Date.now() + 3 * DAY))).rejects.toThrow();
    expect(await prisma.rescheduleRequest.count({ where: { classSessionId: f.session.id } })).toBe(0);
  });

  it("only one pending request per class", async () => {
    const f = await createSessionFixture({ startsAt: inDays(3) });
    await parentPropose(f, ymd(f.startsAt.getTime() + 2 * DAY));
    await expect(parentPropose(f, ymd(f.startsAt.getTime() + 3 * DAY))).rejects.toThrow();
    expect(await prisma.rescheduleRequest.count({ where: { classSessionId: f.session.id } })).toBe(1);
  });

  it("date after the cycle deadline: refused", async () => {
    const f = await createSessionFixture({ startsAt: inDays(3) });
    await expect(parentPropose(f, ymd(f.startsAt.getTime() + 60 * DAY))).rejects.toThrow();
    expect(await prisma.rescheduleRequest.count({ where: { classSessionId: f.session.id } })).toBe(0);
  });

  it("third approved reschedule is refused (cap of 2)", async () => {
    const f = await createSessionFixture({ startsAt: inDays(3) });
    for (const offset of [2, 3]) {
      await parentPropose(f, ymd(f.startsAt.getTime() + offset * DAY));
      await teacherApprove(f, (await pendingFor(f)).id);
    }
    expect(await prisma.rescheduleRequest.count({ where: { classSessionId: f.session.id, status: "APPROVED" } })).toBe(2);
    await expect(parentPropose(f, ymd(f.startsAt.getTime() + 4 * DAY))).rejects.toThrow();
    expect(await prisma.rescheduleRequest.count({ where: { classSessionId: f.session.id } })).toBe(2);
  });
});