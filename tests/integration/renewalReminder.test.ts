import { beforeAll, describe, expect, it } from "vitest";
import { runRenewalReminderSweep } from "@/features/shared/server/renewalReminder.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
/** Today's calendar date in IST (the platform timezone), as UTC midnight. */
const istToday = () => {
  const t = new Date(Date.now() + 5.5 * 3_600_000);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};

beforeAll(async () => {
  await resetDb();
});

async function cycleEndingIn(daysLeft: number, opts: { weekly?: boolean; legacy?: boolean } = {}) {
  const f = await createSessionFixture({});
  const end = new Date(istToday() + daysLeft * DAY);
  await prisma.enrollmentCycle.update({
    where: { id: f.cycle.id },
    data: { startDate: new Date(end.getTime() - 29 * DAY), endDate: end },
  });
  await prisma.enrollment.update({
    where: { id: f.enrollment.id },
    data: {
      isLegacy: opts.legacy ?? false,
      ...(opts.weekly ? { planType: "WEEKLY" as const } : {}),
    },
  });
  return f;
}

const stamps = async (cycleId: string) => {
  const c = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: cycleId } });
  return {
    d7: c.renewalReminder7SentAt,
    d5: c.renewalReminder5SentAt,
    d2: c.renewalReminder2SentAt,
  };
};

describe("Renewal reminders (cycle-model enrollments)", () => {
  it("8 days left: nothing yet", async () => {
    const f = await cycleEndingIn(8);
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect([s.d7, s.d5, s.d2]).toEqual([null, null, null]);
  });

  it("6 days left: the 7-day reminder only", async () => {
    const f = await cycleEndingIn(6);
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect(s.d7).not.toBeNull();
    expect(s.d5).toBeNull();
    expect(s.d2).toBeNull();
  });

  it("5 days left: the 5-day reminder (7-day one is marked as skipped)", async () => {
    const f = await cycleEndingIn(5);
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect(s.d5).not.toBeNull();
    expect(s.d7).not.toBeNull();
    expect(s.d2).toBeNull();
  });

  it("2 days left: the last reminder, earlier tiers marked as skipped", async () => {
    const f = await cycleEndingIn(2);
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect(s.d2).not.toBeNull();
    expect(s.d5).not.toBeNull();
    expect(s.d7).not.toBeNull();
  });

  it("running it twice sends nothing new (stamps unchanged)", async () => {
    const f = await cycleEndingIn(5);
    await runRenewalReminderSweep();
    const first = await stamps(f.cycle.id);
    await runRenewalReminderSweep();
    const second = await stamps(f.cycle.id);
    expect(second).toEqual(first);
  });

  it("weekly plan with 5 days left: no reminder (only the 2-day tier applies)", async () => {
    const f = await cycleEndingIn(5, { weekly: true });
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect([s.d7, s.d5, s.d2]).toEqual([null, null, null]);
  });

  it("weekly plan with 2 days left: the 2-day reminder", async () => {
    const f = await cycleEndingIn(2, { weekly: true });
    await runRenewalReminderSweep();
    expect((await stamps(f.cycle.id)).d2).not.toBeNull();
  });

  it("legacy enrollment: ignored", async () => {
    const f = await cycleEndingIn(2, { legacy: true });
    await runRenewalReminderSweep();
    const s = await stamps(f.cycle.id);
    expect([s.d7, s.d5, s.d2]).toEqual([null, null, null]);
  });
});