import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Razorpay is never called: orders.create records what it was asked, orders.fetch answers from a store.
const rz = vi.hoisted(() => ({
  orders: {} as Record<string, Record<string, unknown>>,
  created: [] as Record<string, unknown>[],
  seq: 0,
}));

vi.mock("@/lib/razorpay", async (orig) => {
  const actual = await orig<typeof import("@/lib/razorpay")>();
  return {
    ...actual,
    getRazorpayClient: () => ({
      orders: {
        create: async (body: Record<string, unknown>) => {
          const id = `order_new_${++rz.seq}`;
          const order = { id, status: "created", currency: "INR", ...body };
          rz.created.push(order);
          rz.orders[id] = order;
          return order;
        },
        fetch: async (id: string) => rz.orders[id],
      },
    }),
  };
});

import { createEnrollmentOrder } from "@/features/parent/server/enrollment/order";
import { reconcileEnrollmentFromWebhook } from "@/features/parent/server/enrollment/webhook";
import {
  createDemoCouponPurchaseOrder,
  reconcileDemoCouponPurchaseFromWebhook,
  verifyDemoCouponPurchase,
} from "@/features/parent/server/demoCoupon/purchase";
import { reconcileDemoBookingFromWebhook } from "@/features/parent/server/demoCoupon/bookingPayment";
import {
  createWalletTopupOrder,
  reconcileWalletTopupFromWebhook,
  verifyWalletTopup,
} from "@/features/shared/server/wallet/topup";
import { rupeesToPaise } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const KEY_SECRET = "test-key-secret";
const checkoutSig = (orderId: string, payId: string) =>
  createHmac("sha256", KEY_SECRET).update(`${orderId}|${payId}`).digest("hex");

const DAY = 86_400_000;
const istDate = (offsetDays: number) => new Date(Date.now() + 5.5 * 3_600_000 + offsetDays * DAY).toISOString().slice(0, 10);

let seq = 0;
const nextPay = () => `pay_fp_${++seq}`;

/** A parent, student, approved teacher and an APPROVED priced course, ready to be enrolled in. */
async function enrollable() {
  const f = await createSessionFixture({});
  await prisma.course.update({
    where: { id: f.course.id },
    data: { status: "APPROVED", price: 500, duration: "1 Hour", subject: "Maths", grade: "5" },
  });
  return f;
}
const input = (f: Awaited<ReturnType<typeof enrollable>>, startOffset = 2) => ({
  studentId: f.student.id,
  teacherId: f.teacher.id,
  courseId: f.course.id,
  cycleStartDate: istDate(startOffset),
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  scheduleTime: "10:00",
});

beforeAll(async () => {
  process.env.RAZORPAY_TEST_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_TEST_KEY_ID = "rzp_test_dummy";
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Enrollment: first payment", () => {
  it("creating the order writes NOTHING to the database", async () => {
    const f = await enrollable();
    const before = await prisma.enrollment.count({ where: { parentId: f.parent.id } });
    const { order, pricing } = await createEnrollmentOrder(f.parent.id, input(f));
    expect(order.id).toBeTruthy();
    expect(pricing.totalAmount).toBe(pricing.sessionsPerMonth * 500);
    expect(await prisma.enrollment.count({ where: { parentId: f.parent.id } })).toBe(before);
  });

  it("order creation refuses a start date in the past", async () => {
    const f = await enrollable();
    await expect(createEnrollmentOrder(f.parent.id, input(f, -3))).rejects.toThrow(/past/i);
  });

  it("order creation refuses another parent's student", async () => {
    const f = await enrollable();
    const other = await createSessionFixture({});
    await expect(
      createEnrollmentOrder(f.parent.id, { ...input(f), studentId: other.student.id }),
    ).rejects.toThrow();
  });

  it("order creation refuses a course that is not APPROVED", async () => {
    const f = await enrollable();
    await prisma.course.update({ where: { id: f.course.id }, data: { status: "DRAFT" } });
    await expect(createEnrollmentOrder(f.parent.id, input(f))).rejects.toThrow();
  });

  it("paid webhook -> one enrollment + cycle 1 + invoice; a duplicate delivery adds nothing", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };

    const pay = nextPay();
    const e1 = await reconcileEnrollmentFromWebhook(order.id as string, pay);
    const e2 = await reconcileEnrollmentFromWebhook(order.id as string, pay);

    expect(e1).not.toBeNull();
    expect(e2?.id).toBe(e1?.id);
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
    const cycles = await prisma.enrollmentCycle.findMany({ where: { enrollmentId: e1!.id } });
    expect(cycles).toHaveLength(1);
    expect(cycles[0].cycleNumber).toBe(1);
    expect(Number(e1!.amountPaid)).toBe(Number(cycles[0].price));
    expect(await prisma.invoice.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
  });

  it("unpaid order -> nothing is created", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    expect(await reconcileEnrollmentFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(0);
  });

  it("order of another kind -> ignored", async () => {
    rz.orders["order_other"] = { id: "order_other", status: "paid", amount: 10000, notes: { kind: "wallet_topup" } };
    expect(await reconcileEnrollmentFromWebhook("order_other", nextPay())).toBeNull();
  });

  it("amount that does not match the re-computed price -> refused, nothing created", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: 100 };
    expect(await reconcileEnrollmentFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(0);
  });

  it("a payment that cleared just before midnight still creates the enrollment (start-date rule is order-time only)", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f, 1));
    // The same order is verified after its start date has passed: rewrite the stamped start date into the past.
    const notes = { ...(rz.orders[order.id as string].notes as Record<string, unknown>), cycleStartDate: istDate(-1) };
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", notes };
    const e = await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    expect(e).not.toBeNull();
  });

  it("referral: the referrer is paid once when the referee's FIRST enrollment is reconciled", async () => {
    const f = await enrollable();
    const referrer = await createSessionFixture({});
    // The referee must have no enrollment yet (the reward is for the first one only).
    const referee = await prisma.parentProfile.create({
      data: { cognitoSub: `ref-${Date.now()}`, firstName: "Ref", lastName: "Eree", phone: "9000000001", email: `ref-${Date.now()}@test.local` },
    });
    const kid = await prisma.student.create({ data: { parentId: referee.id, firstName: "Kid", lastName: "Ree" } });
    await prisma.referral.create({
      data: { referrerParentId: referrer.parent.id, refereeParentId: referee.id, code: "REFTEST9", status: "PENDING", rewardAmount: 500 },
    });
    const { order } = await createEnrollmentOrder(referee.id, { ...input(f), studentId: kid.id });
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    const w = await prisma.wallet.findUnique({ where: { parentId: referrer.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(500);
    const r = await prisma.referral.findUniqueOrThrow({ where: { refereeParentId: referee.id } });
    expect(r.status).toBe("REWARDED");
  });
});

describe("Wallet top-up", () => {
  it("order creation writes nothing and refuses amounts outside the limits", async () => {
    const f = await createSessionFixture({});
    await expect(createWalletTopupOrder(f.parent.id, 50)).rejects.toThrow();
    await expect(createWalletTopupOrder(f.parent.id, 25001)).rejects.toThrow();
    await expect(createWalletTopupOrder(f.parent.id, Number.NaN)).rejects.toThrow();
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    expect(order.id).toBeTruthy();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(await prisma.walletTransaction.count({ where: { walletId: w?.id ?? "none" } })).toBe(0);
  });

  async function paidTopup(parentId: string, amount: number) {
    const { order } = await createWalletTopupOrder(parentId, amount);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    return order.id as string;
  }

  it("verify: good signature credits exactly the amount; a retry does not credit twice", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    const pay = nextPay();
    const input = { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) };
    await verifyWalletTopup(f.parent.id, input);
    await verifyWalletTopup(f.parent.id, input);
    const w = await prisma.wallet.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(Number(w.balance)).toBe(500);
    expect(await prisma.walletTransaction.count({ where: { walletId: w.id } })).toBe(1);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: orderId } })).toBe(1);
  });

  it("verify: bad signature -> refused, nothing credited", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    await expect(
      verifyWalletTopup(f.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: nextPay(), razorpaySignature: "bad" }),
    ).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
    expect(await prisma.walletTransaction.count({ where: { walletId: w?.id ?? "none" } })).toBe(0);
  });

  it("verify: another parent's order cannot be claimed", async () => {
    const f = await createSessionFixture({});
    const thief = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    const pay = nextPay();
    await expect(
      verifyWalletTopup(thief.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) }),
    ).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: thief.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
  });

  it("verify: unpaid order -> refused (402)", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    const pay = nextPay();
    await expect(
      verifyWalletTopup(f.parent.id, { razorpayOrderId: order.id as string, razorpayPaymentId: pay, razorpaySignature: checkoutSig(order.id as string, pay) }),
    ).rejects.toThrow(/complete|status/i);
  });

  it("webhook (tab closed): paid order credits once; second delivery adds nothing; verify afterwards adds nothing", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 1000);
    const pay = nextPay();
    await reconcileWalletTopupFromWebhook(orderId, pay);
    await reconcileWalletTopupFromWebhook(orderId, pay);
    await verifyWalletTopup(f.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) });
    const w = await prisma.wallet.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(Number(w.balance)).toBe(1000);
  });

  it("webhook: unpaid or non-wallet order -> nothing credited", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    expect(await reconcileWalletTopupFromWebhook(order.id as string, nextPay())).toBeNull();
    rz.orders["order_wrongkind"] = { id: "order_wrongkind", status: "paid", amount: 50000, notes: { kind: "enrollment" } };
    expect(await reconcileWalletTopupFromWebhook("order_wrongkind", nextPay())).toBeNull();
  });

  it("webhook: Razorpay charged LESS than the top-up amount -> refused, nothing credited", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 1000);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: rupeesToPaise(100) };
    await expect(reconcileWalletTopupFromWebhook(order.id as string, nextPay())).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
  });
});

describe("Demo coupon purchase", () => {
  it("quantity outside 1-20 is refused at order time", async () => {
    const f = await createSessionFixture({});
    await expect(createDemoCouponPurchaseOrder(f.parent.id, 0)).rejects.toThrow();
    await expect(createDemoCouponPurchaseOrder(f.parent.id, 21)).rejects.toThrow();
  });

  it("webhook: paid order adds coupons once (2 free + 3 bought = 5); duplicate delivery adds nothing", async () => {
    const f = await createSessionFixture({});
    const { order, amount } = await createDemoCouponPurchaseOrder(f.parent.id, 3);
    expect(amount).toBe(300);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    const pay = nextPay();
    await reconcileDemoCouponPurchaseFromWebhook(order.id as string, pay);
    await reconcileDemoCouponPurchaseFromWebhook(order.id as string, pay);
    const c = await prisma.demoCoupon.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(c.totalIssued).toBe(5);
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(1);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
  });

  it("webhook: wrong amount -> refused, no coupons", async () => {
    const f = await createSessionFixture({});
    const { order } = await createDemoCouponPurchaseOrder(f.parent.id, 3);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: 100 };
    expect(await reconcileDemoCouponPurchaseFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(0);
  });

  it("verify: bad signature refused; good signature then retry credits once", async () => {
    const f = await createSessionFixture({});
    const { order } = await createDemoCouponPurchaseOrder(f.parent.id, 2);
    const id = order.id as string;
    rz.orders[id] = { ...rz.orders[id], status: "paid" };
    await expect(
      verifyDemoCouponPurchase(f.parent.id, { quantity: 2, razorpayOrderId: id, razorpayPaymentId: nextPay(), razorpaySignature: "bad" }),
    ).rejects.toThrow();
    const pay = nextPay();
    const good = { quantity: 2, razorpayOrderId: id, razorpayPaymentId: pay, razorpaySignature: checkoutSig(id, pay) };
    await verifyDemoCouponPurchase(f.parent.id, good);
    await verifyDemoCouponPurchase(f.parent.id, good);
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(1);
    expect((await prisma.demoCoupon.findUniqueOrThrow({ where: { parentId: f.parent.id } })).totalIssued).toBe(4);
  });
});

describe("Paid demo booking webhook", () => {
  it("non-demo / unpaid / unknown orders create no booking", async () => {
    rz.orders["order_demo_unpaid"] = { id: "order_demo_unpaid", status: "created", amount: 10000, notes: { kind: "demo_booking" } };
    rz.orders["order_demo_wrongkind"] = { id: "order_demo_wrongkind", status: "paid", amount: 10000, notes: { kind: "wallet_topup" } };
    expect(await reconcileDemoBookingFromWebhook("order_demo_unpaid", nextPay())).toBeNull();
    expect(await reconcileDemoBookingFromWebhook("order_demo_wrongkind", nextPay())).toBeNull();
    expect(await prisma.demoBooking.count()).toBe(0);
  });
});