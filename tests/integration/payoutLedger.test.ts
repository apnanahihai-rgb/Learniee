import { beforeAll, describe, expect, it } from "vitest";
import {
  adminConfirmRejectLedgerPayout,
  adminReleaseLedgerPayout,
  adminReopenLedgerPayout,
  holdLedgerPayout,
  proceedLedgerPayout,
  rejectLedgerPayout,
} from "@/features/shared/server/tuitionLedger/actions";
import { closeCycleIfDue } from "@/features/shared/server/cycleClose/close";
import { releaseClosedCyclePayout } from "@/features/shared/server/cycleClose/release";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const ACC = "accounts-test-sub";
const ADM = "admin-test-sub";

beforeAll(async () => {
  await resetDb();
});

/** A real ledger row, made the real way: 4 completed sessions -> close -> release. */
async function ledgerEntry() {
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

const status = async (id: string) =>
  (await prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id } })).payoutStatus;

describe("Accounts verification", () => {
  it("new ledger row waits for verification", async () => {
    const { entry } = await ledgerEntry();
    expect(entry.payoutStatus).toBe("PENDING_VERIFICATION");
  });

  it("Proceed: queued for payment, who verified is recorded", async () => {
    const { entry } = await ledgerEntry();
    await proceedLedgerPayout(entry.id, ACC);
    const e = await prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(e.payoutStatus).toBe("QUEUED_FOR_PAYMENT");
    expect(e.verifiedByStaffSub).toBe(ACC);
    expect(e.verifiedAt).not.toBeNull();
  });

  it("a verified row cannot be verified again", async () => {
    const { entry } = await ledgerEntry();
    await proceedLedgerPayout(entry.id, ACC);
    await expect(proceedLedgerPayout(entry.id, ACC)).rejects.toThrow();
    await expect(holdLedgerPayout(entry.id, ACC, "late")).rejects.toThrow();
    expect(await status(entry.id)).toBe("QUEUED_FOR_PAYMENT");
  });

  it("Hold: ON_HOLD with the reason kept", async () => {
    const { entry } = await ledgerEntry();
    await holdLedgerPayout(entry.id, ACC, "Check bank details");
    const e = await prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(e.payoutStatus).toBe("ON_HOLD");
    expect(e.holdReason).toBe("Check bank details");
  });

  it("Reject: REJECTED with the reason kept", async () => {
    const { entry } = await ledgerEntry();
    await rejectLedgerPayout(entry.id, ACC, "Class disputed");
    const e = await prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(e.payoutStatus).toBe("REJECTED");
    expect(e.rejectionReason).toBe("Class disputed");
  });
});

describe("Admin review of Hold / Reject", () => {
  it("Hold then Admin Release: queued for payment", async () => {
    const { entry } = await ledgerEntry();
    await holdLedgerPayout(entry.id, ACC, "x");
    await adminReleaseLedgerPayout(entry.id, ADM);
    const e = await prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(e.payoutStatus).toBe("QUEUED_FOR_PAYMENT");
    expect(e.adminReviewedAt).not.toBeNull();
    expect(e.adminReviewedByStaffSub).toBe(ADM);
  });

  it("Hold then Admin Send back: Accounts verifies it again", async () => {
    const { entry } = await ledgerEntry();
    await holdLedgerPayout(entry.id, ACC, "x");
    await adminReopenLedgerPayout(entry.id, ADM);
    expect(await status(entry.id)).toBe("PENDING_VERIFICATION");
  });

  it("Reject then Admin Confirm reject: final, cannot be released afterwards", async () => {
    const { entry } = await ledgerEntry();
    await rejectLedgerPayout(entry.id, ACC, "x");
    await adminConfirmRejectLedgerPayout(entry.id, ADM);
    expect(await status(entry.id)).toBe("REJECTED");
    await expect(adminReleaseLedgerPayout(entry.id, ADM)).rejects.toThrow();
    expect(await status(entry.id)).toBe("REJECTED");
  });

  it("Admin cannot act on a row Accounts has not held or rejected", async () => {
    const { entry } = await ledgerEntry();
    await expect(adminReleaseLedgerPayout(entry.id, ADM)).rejects.toThrow();
    expect(await status(entry.id)).toBe("PENDING_VERIFICATION");
  });
});