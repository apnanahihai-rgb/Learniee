import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentPlanType } from "@prisma/client";

const store = vi.hoisted(() => ({ orders: {} as Record<string, unknown> }));

vi.mock("@/lib/razorpay", async (orig) => {
  const actual = await orig<typeof import("@/lib/razorpay")>();
  return {
    ...actual,
    getRazorpayClient: () => ({ orders: { fetch: async (id: string) => store.orders[id] } }),
  };
});

import { reconcileRenewalFromWebhook } from "@/features/parent/server/renewal/webhook";
import { buildCyclePlan, priceForSessions } from "@/features/shared/utils/cyclePlan";
import { rupeesToPaise } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const now = new Date();
const D0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
let seq = 0;

/** ACTIVE enrollment whose cycle 1 ends in 3 days (renewal window open). Returns what a paid renewal order needs. */
async function renewable() {
  const f = await createSessionFixture({});
  const end = new Date(D0 + 3 * DAY);
  await prisma.enrollmentCycle.update({
    where: { id: f.cycle.id },
    data: { startDate: new Date(end.getTime() - 29 * DAY), endDate: end },
  });
  await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { sessionLengthMinutes: 60 } });

  const cycleStartDate = ymd(end.getTime() + DAY);
  const scheduleDays = [0, 1, 2, 3, 4, 5, 6];
  const plan = buildCyclePlan(cycleStartDate, scheduleDays, EnrollmentPlanType.MONTHLY, []);
  if (!plan) throw new Error("test setup: no plan");
  const price = priceForSessions(500, plan.sessionCount);
  return { ...f, cycleStartDate, scheduleDays, sessionCount: plan.sessionCount, price };
}

function putOrder(
  r: Awaited<ReturnType<typeof renewable>>,
  over: { status?: string; amount?: number; kind?: string } = {},
) {
  const id = `order_ren_${++seq}`;
  store.orders[id] = {
    id,
    status: over.status ?? "paid",
    amount: over.amount ?? rupeesToPaise(r.price),
    currency: "INR",
    notes: {
      kind: over.kind ?? "cycle_renewal",
      parentId: r.parent.id,
      enrollmentId: r.enrollment.id,
      cycleNumber: "2",
      cycleStartDate: r.cycleStartDate,
      scheduleDays: JSON.stringify(r.scheduleDays),
      scheduleTime: "10:00",
      sessionCount: String(r.sessionCount),
      walletAmount: "0",
    },
  };
  return id;
}

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("renewal reconciled from the webhook (parent closed the tab)", () => {
  it("paid order -> cycle 2 + all its sessions + invoice; second delivery adds nothing", async () => {
    const r = await renewable();
    const orderId = putOrder(r);
    const payId = `pay_ren_${++seq}`;

    const first = await reconcileRenewalFromWebhook(orderId, payId);
    expect(first).toBeTruthy();

    const cycles = await prisma.enrollmentCycle.findMany({
      where: { enrollmentId: r.enrollment.id },
      orderBy: { cycleNumber: "asc" },
    });
    expect(cycles.map((c) => c.cycleNumber)).toEqual([1, 2]);
    expect(cycles[1].status).toBe("OPEN");
    expect(cycles[1].paymentReference).toBe(payId);
    expect(cycles[1].sessionCount).toBe(r.sessionCount);
    expect(Number(cycles[1].price)).toBe(r.price);

    expect(await prisma.classSession.count({ where: { cycleId: cycles[1].id } })).toBe(r.sessionCount);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: orderId } })).toBe(1);

    const second = await reconcileRenewalFromWebhook(orderId, payId);
    expect(second!.id).toBe(first!.id);
    expect(await prisma.enrollmentCycle.count({ where: { enrollmentId: r.enrollment.id } })).toBe(2);
    expect(await prisma.classSession.count({ where: { cycleId: cycles[1].id } })).toBe(r.sessionCount);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: orderId } })).toBe(1);
  });

  it("order not paid -> nothing created", async () => {
    const r = await renewable();
    const orderId = putOrder(r, { status: "created" });
    expect(await reconcileRenewalFromWebhook(orderId, `pay_ren_${++seq}`)).toBeNull();
    expect(await prisma.enrollmentCycle.count({ where: { enrollmentId: r.enrollment.id } })).toBe(1);
  });

  it("not a renewal order -> null, nothing created", async () => {
    const r = await renewable();
    const orderId = putOrder(r, { kind: "enrollment" });
    expect(await reconcileRenewalFromWebhook(orderId, `pay_ren_${++seq}`)).toBeNull();
    expect(await prisma.enrollmentCycle.count({ where: { enrollmentId: r.enrollment.id } })).toBe(1);
  });

  it("amount does not match the enrollment's rate -> null, nothing created (needs manual refund)", async () => {
    const r = await renewable();
    const orderId = putOrder(r, { amount: rupeesToPaise(r.price) - 100 });
    expect(await reconcileRenewalFromWebhook(orderId, `pay_ren_${++seq}`)).toBeNull();
    expect(await prisma.enrollmentCycle.count({ where: { enrollmentId: r.enrollment.id } })).toBe(1);
  });

  it("a second, different payment for the same cycle is refused (no double cycle)", async () => {
    const r = await renewable();
    await reconcileRenewalFromWebhook(putOrder(r), `pay_ren_${++seq}`);
    const again = await reconcileRenewalFromWebhook(putOrder(r), `pay_ren_${++seq}`);
    expect(again).toBeNull();
    expect(await prisma.enrollmentCycle.count({ where: { enrollmentId: r.enrollment.id } })).toBe(2);
  });
});