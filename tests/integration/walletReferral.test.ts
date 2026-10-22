import { beforeAll, describe, expect, it } from "vitest";
import { creditWallet, debitWallet, getOrCreateWallet } from "@/features/shared/server/wallet/core";
import { processReferralRewardForNewEnrollment } from "@/features/shared/server/referral.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

beforeAll(async () => {
  await resetDb();
});

async function newParent() {
  const f = await createSessionFixture({});
  return f.parent;
}

const bal = async (parentId: string) => Number((await getOrCreateWallet(parentId)).balance);

describe("Wallet", () => {
  it("credit then debit: balance and history are right", async () => {
    const p = await newParent();
    await creditWallet({ parentId: p.id, amount: 1000, reason: "Test credit" });
    expect(await bal(p.id)).toBe(1000);
    await debitWallet({ parentId: p.id, amount: 400, reason: "Test debit" });
    expect(await bal(p.id)).toBe(600);

    const w = await getOrCreateWallet(p.id);
    const tx = await prisma.walletTransaction.findMany({ where: { walletId: w.id }, orderBy: { createdAt: "asc" } });
    expect(tx.map((t) => t.type)).toEqual(["CREDIT", "DEBIT"]);
    expect(tx.map((t) => Number(t.balanceAfter))).toEqual([1000, 600]);
  });

  it("cannot spend more than the balance, and nothing changes", async () => {
    const p = await newParent();
    await creditWallet({ parentId: p.id, amount: 300, reason: "Test credit" });
    await expect(debitWallet({ parentId: p.id, amount: 301, reason: "Too much" })).rejects.toThrow();
    expect(await bal(p.id)).toBe(300);
    const w = await getOrCreateWallet(p.id);
    expect(await prisma.walletTransaction.count({ where: { walletId: w.id } })).toBe(1);
  });

  it("zero and negative amounts are refused", async () => {
    const p = await newParent();
    await expect(creditWallet({ parentId: p.id, amount: 0, reason: "x" })).rejects.toThrow();
    await expect(creditWallet({ parentId: p.id, amount: -50, reason: "x" })).rejects.toThrow();
    await expect(debitWallet({ parentId: p.id, amount: -50, reason: "x" })).rejects.toThrow();
    expect(await bal(p.id)).toBe(0);
  });

  it("two debits at the same time cannot overspend", async () => {
    const p = await newParent();
    await creditWallet({ parentId: p.id, amount: 500, reason: "Test credit" });
    const results = await Promise.allSettled([
      debitWallet({ parentId: p.id, amount: 400, reason: "A" }),
      debitWallet({ parentId: p.id, amount: 400, reason: "B" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await bal(p.id)).toBe(100);
  });
});

describe("Referral reward", () => {
  it("referee's first enrollment pays the referrer 500 once", async () => {
    const referrer = await newParent();
    const f = await createSessionFixture({});
    await prisma.parentProfile.update({ where: { id: referrer.id }, data: { referralCode: "REFTEST1" } });
    await prisma.referral.create({
      data: { referrerParentId: referrer.id, refereeParentId: f.parent.id, code: "REFTEST1" },
    });

    await processReferralRewardForNewEnrollment(f.parent.id, f.enrollment.id);
    expect(await bal(referrer.id)).toBe(500);
    const r = await prisma.referral.findUniqueOrThrow({ where: { refereeParentId: f.parent.id } });
    expect(r.status).toBe("REWARDED");
    expect(r.enrollmentId).toBe(f.enrollment.id);

    await processReferralRewardForNewEnrollment(f.parent.id, f.enrollment.id);
    expect(await bal(referrer.id)).toBe(500);
  });

  it("a parent nobody referred earns nobody anything", async () => {
    const f = await createSessionFixture({});
    await processReferralRewardForNewEnrollment(f.parent.id, f.enrollment.id);
    expect(await prisma.walletTransaction.count()).toBeGreaterThanOrEqual(0);
    expect(await prisma.referral.count({ where: { refereeParentId: f.parent.id } })).toBe(0);
  });
});