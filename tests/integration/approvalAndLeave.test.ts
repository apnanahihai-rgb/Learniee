import { beforeAll, describe, expect, it } from "vitest";
import { adminApproveEnrollment } from "@/features/shared/server/enrollmentApproval/admin";
import { applyApprovedLeaveToSessions } from "@/features/shared/server/leaveShift.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const n = new Date();
const D0 = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());

/** Enrollment waiting for Admin approval, cycle 1 with no sessions yet, every weekday allowed. */
async function pendingEnrollment(startOffsetDays: number) {
  const f = await createSessionFixture({});
  await prisma.classSession.delete({ where: { id: f.session.id } });

  let start = new Date(D0 + startOffsetDays * DAY);
  if (start.getUTCDate() > 28) {
    start =
      startOffsetDays > 0
        ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
        : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 28));
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()) - DAY);
  const count = Math.round((end.getTime() - start.getTime()) / DAY) + 1;

  await prisma.enrollment.update({
    where: { id: f.enrollment.id },
    data: {
      status: "PENDING_ADMIN_APPROVAL",
      teacherApprovedAt: new Date(),
      cycleStartDate: start,
      dueDate: new Date(end.getTime() + DAY),
      sessionsPerMonth: count,
      monthlyRate: 500 * count,
      totalAmount: 500 * count,
      amountPaid: 500 * count,
      sessionLengthMinutes: 60,
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      scheduleTime: "10:00",
    },
  });
  await prisma.enrollmentCycle.update({
    where: { id: f.cycle.id },
    data: { startDate: start, endDate: end, sessionCount: count, price: 500 * count },
  });
  return { ...f, count };
}

beforeAll(async () => {
  await resetDb();
});

describe("Admin approval creates the sessions", () => {
  it("approves: ACTIVE, exactly N sessions numbered 1..N, all SCHEDULED", async () => {
    const f = await pendingEnrollment(3);
    await adminApproveEnrollment(f.enrollment.id);
    const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } });
    expect(e.status).toBe("ACTIVE");
    const sessions = await prisma.classSession.findMany({
      where: { enrollmentId: f.enrollment.id },
      orderBy: { sessionNumber: "asc" },
    });
    expect(sessions).toHaveLength(f.count);
    expect(sessions.map((s) => s.sessionNumber)).toEqual(Array.from({ length: f.count }, (_, i) => i + 1));
    expect(sessions.every((s) => s.status === "SCHEDULED" && s.cycleId === f.cycle.id)).toBe(true);
  });

  it("approving twice does not create more sessions", async () => {
    const f = await pendingEnrollment(3);
    await adminApproveEnrollment(f.enrollment.id);
    await expect(adminApproveEnrollment(f.enrollment.id)).rejects.toThrow();
    expect(await prisma.classSession.count({ where: { enrollmentId: f.enrollment.id } })).toBe(f.count);
  });

  it("start date already passed: approval refused, nothing created", async () => {
    const f = await pendingEnrollment(-3);
    await expect(adminApproveEnrollment(f.enrollment.id)).rejects.toThrow();
    const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } });
    expect(e.status).toBe("PENDING_ADMIN_APPROVAL");
    expect(await prisma.classSession.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });
});

describe("Approved leave shifts or excuses sessions", () => {
  /** Class at 10:00 IST (04:30 UTC) three days from today. */
  const classAt = new Date(D0 + 3 * DAY + 4.5 * 3_600_000);

  it("one-day leave: the class moves to a free slot outside the leave", async () => {
    const f = await createSessionFixture({ startsAt: classAt });
    const leave = await prisma.leaveRequest.create({
      data: {
        teacherId: f.teacher.id,
        startDate: new Date(D0 + 3 * DAY),
        endDate: new Date(D0 + 3 * DAY),
        reason: "Test leave",
        status: "APPROVED",
      },
    });
    const r = await applyApprovedLeaveToSessions(leave.id);
    expect(r).toEqual({ moved: 1, excused: 0 });
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("SCHEDULED");
    expect(s.startsAt!.getTime()).toBeGreaterThan(classAt.getTime());
    expect(utcDay(s.startsAt!)).not.toBe(D0 + 3 * DAY);
    const again = await applyApprovedLeaveToSessions(leave.id);
    expect(again.moved + again.excused).toBe(0);
  });

  it("leave covers every free slot: class becomes EXCUSED, no strike, already settled", async () => {
    const f = await createSessionFixture({ startsAt: classAt });
    const leave = await prisma.leaveRequest.create({
      data: {
        teacherId: f.teacher.id,
        startDate: new Date(D0),
        endDate: new Date(D0 + 60 * DAY),
        reason: "Long test leave",
        status: "APPROVED",
      },
    });
    const r = await applyApprovedLeaveToSessions(leave.id);
    expect(r.excused).toBe(1);
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: f.session.id } });
    expect(s.status).toBe("EXCUSED");
    expect(s.settledAt).not.toBeNull();
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(0);
  });
});

function utcDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}