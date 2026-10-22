import { beforeAll, describe, expect, it } from "vitest";
import { runDueDateReminderCheck } from "@/features/shared/server/dueDateReminder.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;

beforeAll(async () => {
  await resetDb();
});

async function enrollmentDue(opts: { legacy: boolean; dueInDays: number }) {
  const f = await createSessionFixture({});
  await prisma.enrollment.update({
    where: { id: f.enrollment.id },
    data: { isLegacy: opts.legacy, dueDate: new Date(Date.now() + opts.dueInDays * DAY), dueDateReminderSentAt: null },
  });
  return f;
}

describe("Due-date reminder (legacy enrollments)", () => {
  it("due in 3 days: reminded once, stamped, not reminded again", async () => {
    const f = await enrollmentDue({ legacy: true, dueInDays: 3 });
    const first = await runDueDateReminderCheck();
    expect(first.remindedEnrollmentIds).toContain(f.enrollment.id);
    const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } });
    expect(e.dueDateReminderSentAt).not.toBeNull();
    const second = await runDueDateReminderCheck();
    expect(second.remindedEnrollmentIds).not.toContain(f.enrollment.id);
  });

  it("due in 10 days: not reminded yet", async () => {
    const f = await enrollmentDue({ legacy: true, dueInDays: 10 });
    const r = await runDueDateReminderCheck();
    expect(r.remindedEnrollmentIds).not.toContain(f.enrollment.id);
  });

  it("already past due: not reminded", async () => {
    const f = await enrollmentDue({ legacy: true, dueInDays: -2 });
    const r = await runDueDateReminderCheck();
    expect(r.remindedEnrollmentIds).not.toContain(f.enrollment.id);
  });

  it("cycle-model enrollment: left to the renewal reminders, not this one", async () => {
    const f = await enrollmentDue({ legacy: false, dueInDays: 3 });
    const r = await runDueDateReminderCheck();
    expect(r.remindedEnrollmentIds).not.toContain(f.enrollment.id);
  });

  it("not ACTIVE (lapsed): not reminded", async () => {
    const f = await enrollmentDue({ legacy: true, dueInDays: 3 });
    await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { status: "LAPSED" } });
    const r = await runDueDateReminderCheck();
    expect(r.remindedEnrollmentIds).not.toContain(f.enrollment.id);
  });
});