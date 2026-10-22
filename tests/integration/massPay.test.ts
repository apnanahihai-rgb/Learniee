import { beforeAll, describe, expect, it } from "vitest";
import { proceedLedgerPayout } from "@/features/shared/server/tuitionLedger/actions";
import { massPayTeachers } from "@/features/shared/server/teacherPayout/massPay";
import { isRazorpayXEnabled } from "@/lib/razorpayX";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import { createLedgerEntry } from "../helpers/ledger";

const STAFF = "accounts-test-sub";

beforeAll(async () => {
  delete process.env.RAZORPAYX_ENABLED;
  if (isRazorpayXEnabled()) {
    throw new Error("Refusing to run: RazorpayX is enabled. Tests must use the simulated payout only.");
  }
  await resetDb();
});

async function queued(withBank: "approved" | "pending" | "none") {
  const f = await createLedgerEntry();
  await proceedLedgerPayout(f.entry.id, STAFF);
  if (withBank !== "none") {
    await prisma.bankAccount.create({
      data: {
        teacherId: f.teacher.id,
        accountHolderName: "Tia Teacher",
        accountNumber: "000111222333",
        ifscCode: "TEST0000001",
        status: withBank === "approved" ? "APPROVED" : "PENDING",
      },
    });
  }
  return f;
}

const entryOf = (id: string) => prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id } });

describe("Mass pay (simulated payout)", () => {
  it("approved bank account: ledger row PAID, one SUCCESS record, correct amount", async () => {
    const f = await queued("approved");
    const r = await massPayTeachers([f.teacher.id], STAFF);
    expect(r.paidTeacherIds).toContain(f.teacher.id);
    expect(r.totalAmount).toBe(1400);

    const e = await entryOf(f.entry.id);
    expect(e.payoutStatus).toBe("PAID");
    expect(e.payoutRecordId).not.toBeNull();
    expect(e.paidAt).not.toBeNull();

    const rec = await prisma.payoutRecord.findMany({ where: { teacherId: f.teacher.id } });
    expect(rec).toHaveLength(1);
    expect(rec[0].status).toBe("SUCCESS");
    expect(Number(rec[0].amount)).toBe(1400);
  });

  it("no bank account: skipped, row stays queued", async () => {
    const f = await queued("none");
    const r = await massPayTeachers([f.teacher.id], STAFF);
    expect(r.skippedTeacherIds).toContain(f.teacher.id);
    expect((await entryOf(f.entry.id)).payoutStatus).toBe("QUEUED_FOR_PAYMENT");
    const rec = await prisma.payoutRecord.findMany({ where: { teacherId: f.teacher.id } });
    expect(rec.every((x) => x.status === "SKIPPED_NO_BANK_ACCOUNT")).toBe(true);
  });

  it("bank account not approved yet: skipped, row stays queued", async () => {
    const f = await queued("pending");
    const r = await massPayTeachers([f.teacher.id], STAFF);
    expect(r.skippedTeacherIds).toContain(f.teacher.id);
    expect((await entryOf(f.entry.id)).payoutStatus).toBe("QUEUED_FOR_PAYMENT");
  });

  it("paying the same teacher twice does not pay twice", async () => {
    const f = await queued("approved");
    await massPayTeachers([f.teacher.id], STAFF);
    await expect(massPayTeachers([f.teacher.id], STAFF)).rejects.toThrow();
    const rec = await prisma.payoutRecord.findMany({ where: { teacherId: f.teacher.id, status: "SUCCESS" } });
    expect(rec).toHaveLength(1);
  });

  it("a row that was never verified is not paid", async () => {
    const f = await createLedgerEntry();
    await prisma.bankAccount.create({
      data: {
        teacherId: f.teacher.id,
        accountHolderName: "Tia Teacher",
        accountNumber: "000111222333",
        ifscCode: "TEST0000001",
        status: "APPROVED",
      },
    });
    await expect(massPayTeachers([f.teacher.id], STAFF)).rejects.toThrow();
    expect((await entryOf(f.entry.id)).payoutStatus).toBe("PENDING_VERIFICATION");
  });
});