import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OutcomeConfirmation } from "@prisma/client";
import { acceptExpiredConfirmations } from "@/features/shared/server/sessionConfirmation.service";
import { closeDueCycles, releaseDueCyclePayouts } from "@/features/shared/server/cycleClose/batch";
import { applyApprovedLeaveToSessions } from "@/features/shared/server/leaveShift.service";
import { cancelForLateReschedule } from "@/features/shared/server/rescheduleRequest/propose";
import { resolveSession } from "@/features/shared/server/sessionResolve/resolve";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import { waiveTeacherStrike } from "@/features/shared/server/teacherStrike.service";
import {
  confirmSessionOutcome,
  endSession,
  joinSession,
  reportSessionOutcome,
  startSession,
} from "@/features/shared/server/sessionFlow.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const H = 3_600_000;
const DAY = 24 * H;
const now = new Date();
const D0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const sess = (id: string) => prisma.classSession.findUniqueOrThrow({ where: { id } });

/** Class that ended `endedHoursAgo` ago and was COMPLETED then. */
async function finished(endedHoursAgo: number) {
  const startsAt = new Date(Date.now() - (endedHoursAgo + 1) * H);
  const f = await createSessionFixture({
    startsAt,
    teacherStartedAt: startsAt,
    teacherEndedAt: new Date(startsAt.getTime() + H),
    studentJoinedAt: startsAt,
  });
  await resolveSession(f.session.id);
  await runSessionFollowUps(f.session.id);
  // The 48 h clock runs from when the outcome became final (resolvedAt), so backdate it to the class end.
  await prisma.classSession.update({
    where: { id: f.session.id },
    data: { resolvedAt: new Date(Date.now() - endedHoursAgo * H), completedAt: new Date(Date.now() - endedHoursAgo * H) },
  });
  return f;
}

describe("Start / Join / End (Google Meet off)", () => {
  it("Start is refused more than 10 minutes before the class", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await expect(startSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
    expect((await sess(f.session.id)).teacherStartedAt).toBeNull();
  });

  it("Join is refused before the window too", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await expect(joinSession(f.session.id, f.parent.id)).rejects.toMatchObject({ status: 409 });
  });

  it("Start inside the window records the time once; a second tap keeps the first time", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    const first = (await sess(f.session.id)).teacherStartedAt;
    expect(first).not.toBeNull();
    await startSession(f.session.id, f.teacher.id);
    expect((await sess(f.session.id)).teacherStartedAt?.getTime()).toBe(first!.getTime());
  });

  it("End before Start is refused", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
    await expect(endSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
  });

  it("End with no student yet, early in the class -> refused (student may still join)", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 2 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    await expect(endSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
  });

  it("another parent / another teacher cannot Start or Join (service level)", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
    const other = await createSessionFixture({});
    await expect(startSession(f.session.id, other.teacher.id)).rejects.toThrow();
    await expect(joinSession(f.session.id, other.parent.id)).rejects.toThrow();
  });

  it("full happy path: Start, Join, End after the overlap -> COMPLETED", async () => {
    // Class began 40 min ago, 60 min long: both present 40 min = 67% (>= 50%).
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 40 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    await joinSession(f.session.id, f.parent.id);
    await endSession(f.session.id, f.teacher.id);
    // Rule: overlap is measured inside the scheduled window, so re-run resolve after the end time has passed.
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { endsAt: new Date(Date.now() - 1000), teacherEndedAt: new Date(Date.now() - 1000) },
    });
    await resolveSession(f.session.id);
    const s = await sess(f.session.id);
    expect(["COMPLETED", "NEEDS_REVIEW"]).toContain(s.status);
    expect(s.teacherStartedAt).not.toBeNull();
    expect(s.studentJoinedAt).not.toBeNull();
  });

  it("a Meet outage (enabled but no credentials) never blocks Start / Join", async () => {
    const saved = { ...process.env };
    process.env.GOOGLE_MEET_ENABLED = "true";
    delete process.env.GOOGLE_MEET_SA_CLIENT_EMAIL;
    delete process.env.GOOGLE_MEET_SA_PRIVATE_KEY;
    delete process.env.GOOGLE_MEET_ORGANIZER_EMAIL;
    try {
      const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
      await startSession(f.session.id, f.teacher.id);
      await joinSession(f.session.id, f.parent.id);
      const s = await sess(f.session.id);
      expect(s.teacherStartedAt).not.toBeNull();
      expect(s.studentJoinedAt).not.toBeNull();
      expect(s.meetingUri).toBeNull();
    } finally {
      process.env.GOOGLE_MEET_ENABLED = saved.GOOGLE_MEET_ENABLED ?? "false";
    }
  });
});

describe("48-hour parent confirmation", () => {
  it("auto-accepts only classes whose window (48 h from the outcome) has passed", async () => {
    const old = await finished(60);
    const fresh = await finished(10);
    await acceptExpiredConfirmations(new Date());
    const o = await sess(old.session.id);
    const n = await sess(fresh.session.id);
    expect(o.confirmation).toBe(OutcomeConfirmation.AUTO_ACCEPTED);
    expect(o.settledAt).not.toBeNull();
    expect(n.confirmation).toBeNull();
    expect(n.settledAt).toBeNull();
  });

  it("auto-accept never overrides a parent's report", async () => {
    const f = await finished(60);
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { confirmation: OutcomeConfirmation.REPORTED, reportedAt: new Date(), reportNote: "teacher left early" },
    });
    await acceptExpiredConfirmations(new Date());
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.REPORTED);
    expect(s.settledAt).toBeNull();
  });

  it("'All good' settles the class; tapping again is harmless", async () => {
    const f = await finished(5);
    await confirmSessionOutcome(f.session.id, f.parent.id);
    await confirmSessionOutcome(f.session.id, f.parent.id);
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.PARENT_ACCEPTED);
    expect(s.settledAt).not.toBeNull();
  });

  it("confirm is refused while the class is not over", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * H) });
    await expect(confirmSessionOutcome(f.session.id, f.parent.id)).rejects.toThrow();
  });

  it("another parent cannot confirm or report my class", async () => {
    const f = await finished(5);
    const other = await createSessionFixture({});
    await expect(confirmSessionOutcome(f.session.id, other.parent.id)).rejects.toThrow();
    await expect(reportSessionOutcome(f.session.id, other.parent.id, "I am not the parent")).rejects.toThrow();
    expect((await sess(f.session.id)).settledAt).toBeNull();
  });

  it("report: too-short note refused; a good note holds the class for Admin and blocks 'All good'", async () => {
    const f = await finished(5);
    await expect(reportSessionOutcome(f.session.id, f.parent.id, "x")).rejects.toMatchObject({ status: 400 });
    await reportSessionOutcome(f.session.id, f.parent.id, "The teacher only stayed ten minutes.");
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.REPORTED);
    expect(s.settledAt).toBeNull();
    await expect(confirmSessionOutcome(f.session.id, f.parent.id)).rejects.toMatchObject({ status: 409 });
  });

  it("report after the 48 h window is refused (already accepted)", async () => {
    const f = await finished(60);
    await acceptExpiredConfirmations(new Date());
    await expect(
      reportSessionOutcome(f.session.id, f.parent.id, "Too late but I still want to complain."),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("Batch runners: closeDueCycles / releaseDueCyclePayouts", () => {
  /** A cycle whose 4 sessions are all COMPLETED (outcome final) `hoursAgo` hours ago. */
  async function allFinal(hoursAgo = 60) {
    const f = await createSessionFixture({});
    const ended = new Date(Date.now() - hoursAgo * H);
    const done = (startsAt: Date) => ({
      status: "COMPLETED" as const,
      startsAt,
      endsAt: new Date(startsAt.getTime() + H),
      scheduledDate: utcMidnight(startsAt),
      completedAt: ended,
      resolvedAt: ended,
      followUpAppliedAt: ended,
    });
    await prisma.classSession.update({ where: { id: f.session.id }, data: done(new Date(ended.getTime() - H)) });
    for (let i = 1; i < 4; i++) {
      await prisma.classSession.create({
        data: {
          enrollmentId: f.enrollment.id, teacherId: f.teacher.id, studentId: f.student.id, parentId: f.parent.id,
          scheduledTime: "10:00", cycleId: f.cycle.id, sessionNumber: i + 1, lengthMinutes: 60,
          ...done(new Date(ended.getTime() - (i + 1) * DAY)),
        },
      });
    }
    return f;
  }

  it("closes a fully-final cycle once; a second run closes nothing", async () => {
    const f = await allFinal();
    const r1 = await closeDueCycles();
    expect(r1.closed).toBeGreaterThanOrEqual(1);
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("CLOSED");
    const r2 = await closeDueCycles();
    expect(r2.closed).toBe(0);
  });

  it("does not close a cycle that still has a class to come", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * H) });
    await closeDueCycles();
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("OPEN");
  });

  it("releases the payout only after every session is settled; once", async () => {
    const f = await allFinal(10); // outcome final 10 h ago: the 48 h window is still open
    const rowsOf = () => prisma.tuitionLedgerEntry.findMany({ where: { enrollmentId: f.enrollment.id } });
    await closeDueCycles();
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("CLOSED");
    await releaseDueCyclePayouts();
    expect(await rowsOf()).toHaveLength(0); // window open, nothing settled -> held

    const later = new Date(Date.now() + 49 * H); // window now over
    // Same order as the real sweep: accept expired confirmations, then release.
    await acceptExpiredConfirmations(later);
    await releaseDueCyclePayouts(later);
    const rows = await rowsOf();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].monthlyTeacherPay)).toBe(1400);
    expect(Number(rows[0].profits)).toBe(600);

    await releaseDueCyclePayouts(later);
    expect(await rowsOf()).toHaveLength(1); // running again adds nothing
  });

  it("a cycle whose window already passed releases on the first run", async () => {
    const f = await allFinal(60);
    await closeDueCycles();
    await releaseDueCyclePayouts();
    expect(await prisma.tuitionLedgerEntry.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
  });
});

describe("Strikes", () => {
  async function noShowStrike() {
    const f = await createSessionFixture({ studentJoinedAt: new Date(Date.now() - 2.9 * H) });
    await resolveSession(f.session.id);
    await runSessionFollowUps(f.session.id);
    const strike = await prisma.teacherStrike.findFirstOrThrow({ where: { classSessionId: f.session.id } });
    return { ...f, strike };
  }
  const admin = { sub: "admin-test-sub", name: "Test Admin", email: "admin@test.local" };

  it("waiver needs a real reason", async () => {
    const f = await noShowStrike();
    await expect(waiveTeacherStrike({ strikeId: f.strike.id, reason: "no", admin })).rejects.toMatchObject({ status: 400 });
    expect((await prisma.teacherStrike.findUniqueOrThrow({ where: { id: f.strike.id } })).waivedAt).toBeNull();
  });

  it("waiver is recorded, the strike row stays, and a second waiver is refused", async () => {
    const f = await noShowStrike();
    await waiveTeacherStrike({ strikeId: f.strike.id, reason: "Teacher had a family emergency", admin });
    const s = await prisma.teacherStrike.findUniqueOrThrow({ where: { id: f.strike.id } });
    expect(s.waivedAt).not.toBeNull();
    expect(s.waiveReason).toContain("emergency");
    expect(s.waivedBySub).toBe("admin-test-sub");
    await expect(
      waiveTeacherStrike({ strikeId: f.strike.id, reason: "Trying to waive it again", admin }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("unknown strike -> 404", async () => {
    await expect(
      waiveTeacherStrike({ strikeId: "does-not-exist", reason: "A perfectly good reason", admin }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Teacher reschedule under 4 h = cancel + strike", () => {
  it("class 2 h away: becomes a teacher CANCELLED class with a strike and a make-up", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await cancelForLateReschedule({ sessionId: f.session.id, teacherId: f.teacher.id, reason: "Car broke down" });
    await runSessionFollowUps(f.session.id);
    const s = await sess(f.session.id);
    expect(s.status).toBe("CANCELLED");
    expect(s.cancelledByRole).toBe("TEACHER");
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(1);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(1);
  });

  it("class 10 h away: refused (a normal reschedule request should be used), nothing cancelled", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 10 * H) });
    await expect(
      cancelForLateReschedule({ sessionId: f.session.id, teacherId: f.teacher.id }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await sess(f.session.id)).status).toBe("SCHEDULED");
  });

  it("another teacher cannot cancel it this way", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    const other = await createSessionFixture({});
    await expect(
      cancelForLateReschedule({ sessionId: f.session.id, teacherId: other.teacher.id }),
    ).rejects.toThrow();
    expect((await sess(f.session.id)).status).toBe("SCHEDULED");
  });
});

describe("EXCUSED class gets a make-up after a long leave (extended deadline)", () => {
  it("leave runs past day 45: the cycle gets an extended deadline and the make-up lands after the leave", async () => {
    const classAt = new Date(D0 + 3 * DAY + 4.5 * H);
    const f = await createSessionFixture({ startsAt: classAt });
    const leaveEnd = new Date(D0 + 50 * DAY);
    const leave = await prisma.leaveRequest.create({
      data: { teacherId: f.teacher.id, startDate: new Date(D0), endDate: leaveEnd, reason: "Long test leave", status: "APPROVED" },
    });
    const r = await applyApprovedLeaveToSessions(leave.id);
    expect(r.excused).toBe(1);
    await runSessionFollowUps(f.session.id);

    const cycle = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(cycle.extendedDeadline).not.toBeNull();
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(0);

    const makeup = await prisma.classSession.findFirst({ where: { makeupForSessionId: f.session.id } });
    expect(makeup).not.toBeNull();
    expect(makeup!.startsAt!.getTime()).toBeGreaterThan(leaveEnd.getTime());
  });
});