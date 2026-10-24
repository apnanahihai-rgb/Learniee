import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real RazorpayX is NEVER called: every network function is replaced.
const gw = vi.hoisted(() => ({
  createPayout: vi.fn(),
  fetchPayout: vi.fn(),
  createContact: vi.fn(),
  createFundAccount: vi.fn(),
}));

vi.mock("@/lib/razorpayX", async (orig) => {
  const actual = await orig<typeof import("@/lib/razorpayX")>();
  return {
    ...actual,
    createPayout: gw.createPayout,
    fetchPayout: gw.fetchPayout,
    createContact: gw.createContact,
    createFundAccount: gw.createFundAccount,
  };
});

import { proceedLedgerPayout } from "@/features/shared/server/tuitionLedger/actions";
import {
  applyGatewayPayout,
  dispatchPayoutRecord,
  failPayoutRecord,
  reconcileProcessingPayouts,
} from "@/features/shared/server/teacherPayout/gateway";
import { RazorpayXError } from "@/lib/razorpayX";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import { createLedgerEntry } from "../helpers/ledger";

const SECRET = "test-x-webhook-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

beforeAll(async () => {
  process.env.RAZORPAYX_WEBHOOK_SECRET = SECRET;
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  gw.createPayout.mockReset();
  gw.fetchPayout.mockReset();
  gw.createContact.mockReset().mockResolvedValue({ id: "cont_test" });
  gw.createFundAccount.mockReset().mockResolvedValue({ id: "fa_test" });
});

/** A queued ledger row, an approved bank account and a PROCESSING payout record, as mass-pay would leave them. */
async function processing(opts: { ageMinutes?: number; payoutId?: string } = {}) {
  const f = await createLedgerEntry();
  await proceedLedgerPayout(f.entry.id, "accounts-test-sub");
  await prisma.bankAccount.create({
    data: {
      teacherId: f.teacher.id,
      accountHolderName: "Tia Teacher",
      accountNumber: "000111222333",
      ifscCode: "TEST0000001",
      status: "APPROVED",
    },
  });
  const batch = await prisma.payoutBatch.create({
    data: { initiatedByStaffSub: "accounts-test-sub", totalAmount: 1400, teacherCount: 1, successCount: 0, skippedCount: 0 },
  });
  const record = await prisma.payoutRecord.create({
    data: {
      payoutBatchId: batch.id,
      teacherId: f.teacher.id,
      amount: 1400,
      cycleCount: 1,
      status: "PROCESSING",
      razorpayPayoutId: opts.payoutId ?? null,
      createdAt: new Date(Date.now() - (opts.ageMinutes ?? 0) * 60_000),
    },
  });
  await prisma.tuitionLedgerEntry.update({
    where: { id: f.entry.id },
    data: { payoutStatus: "PROCESSING", payoutRecordId: record.id },
  });
  return { ...f, record };
}

const recOf = (id: string) => prisma.payoutRecord.findUniqueOrThrow({ where: { id } });
const entOf = (id: string) => prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id } });

describe("RazorpayX payout lifecycle (all gateway calls mocked)", () => {
  it("processed -> record SUCCESS, ledger PAID, UTR saved; applying twice changes nothing", async () => {
    const p = await processing();
    const entity = { id: "pout_1", status: "processed", reference_id: p.record.id, utr: "UTR123" };
    expect(await applyGatewayPayout(entity)).toBe("SETTLED");
    expect(await applyGatewayPayout(entity)).toBe("SETTLED");
    const r = await recOf(p.record.id);
    expect(r.status).toBe("SUCCESS");
    expect(r.utr).toBe("UTR123");
    expect(r.razorpayPayoutId).toBe("pout_1");
    const e = await entOf(p.entry.id);
    expect(e.payoutStatus).toBe("PAID");
    expect(e.paidAt).not.toBeNull();
    const paidNotices = await prisma.notification.count({ where: { recipientId: p.teacher.id, type: "PAYOUT_PAID" } });
    expect(paidNotices).toBe(1);
  });

  it("failed / reversed / rejected -> record FAILED and the cycle goes back to the Payment Queue", async () => {
    for (const status of ["failed", "reversed", "rejected"]) {
      const p = await processing();
      const out = await applyGatewayPayout({ id: `pout_${status}`, status, reference_id: p.record.id, failure_reason: "bank said no" });
      expect(out).toBe("FAILED");
      const r = await recOf(p.record.id);
      expect(r.status).toBe("FAILED");
      expect(r.failureReason).toContain("bank said no");
      const e = await entOf(p.entry.id);
      expect(e.payoutStatus).toBe("QUEUED_FOR_PAYMENT");
      expect(e.payoutRecordId).toBeNull();
    }
  });

  it("queued / pending / processing -> still PROCESSING, only the gateway status is remembered", async () => {
    const p = await processing();
    expect(await applyGatewayPayout({ id: "pout_q", status: "queued", reference_id: p.record.id })).toBe("PENDING");
    const r = await recOf(p.record.id);
    expect(r.status).toBe("PROCESSING");
    expect(r.gatewayStatus).toBe("queued");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PROCESSING");
  });

  it("unknown payout -> UNKNOWN_RECORD and nothing changes", async () => {
    const p = await processing();
    expect(await applyGatewayPayout({ id: "pout_nobody", status: "processed", reference_id: "no-such-record" })).toBe("UNKNOWN_RECORD");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });

  it("failure after success (late webhook) cannot undo a PAID payout", async () => {
    const p = await processing();
    await applyGatewayPayout({ id: "pout_x", status: "processed", reference_id: p.record.id });
    await applyGatewayPayout({ id: "pout_x", status: "failed", reference_id: p.record.id });
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });

  it("failPayoutRecord twice: second call does nothing", async () => {
    const p = await processing();
    expect(await failPayoutRecord(p.record.id, "boom")).toBe(true);
    expect(await failPayoutRecord(p.record.id, "boom again")).toBe(false);
  });

  it("dispatch: gateway answers processed -> SETTLED; idempotency key is the record id", async () => {
    const p = await processing();
    gw.createPayout.mockResolvedValue({ id: "pout_d1", status: "processed", reference_id: p.record.id, utr: "U1" });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("SETTLED");
    const call = gw.createPayout.mock.calls[0][0];
    expect(call.idempotencyKey).toBe(p.record.id);
    expect(call.amountInRupees).toBe(1400);
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });

  it("dispatch: gateway answers queued -> SUBMITTED, stays PROCESSING", async () => {
    const p = await processing();
    gw.createPayout.mockResolvedValue({ id: "pout_d2", status: "queued", reference_id: p.record.id });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("SUBMITTED");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });

  it("dispatch: clear 4xx rejection -> FAILED and cycle back in the queue", async () => {
    const p = await processing();
    gw.createPayout.mockRejectedValue(new RazorpayXError("Insufficient balance", 400, true));
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect((await recOf(p.record.id)).status).toBe("FAILED");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("QUEUED_FOR_PAYMENT");
  });

  it("dispatch: timeout / 5xx (outcome unknown) -> stays PROCESSING, NOT failed (money may have moved)", async () => {
    const p = await processing();
    gw.createPayout.mockRejectedValue(new RazorpayXError("timeout", null, false));
    expect(await dispatchPayoutRecord(p.record.id)).toBe("UNKNOWN");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PROCESSING");
  });

  it("dispatch: no approved bank account -> FAILED, nothing sent", async () => {
    const p = await processing();
    await prisma.bankAccount.update({ where: { teacherId: p.teacher.id }, data: { status: "PENDING" } });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect(gw.createPayout).not.toHaveBeenCalled();
  });

  it("dispatch: a record that is not PROCESSING is never sent", async () => {
    const p = await processing();
    await prisma.payoutRecord.update({ where: { id: p.record.id }, data: { status: "SUCCESS" } });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect(gw.createPayout).not.toHaveBeenCalled();
  });

  it("reconcile: old record with a payout id asks the gateway and settles", async () => {
    const p = await processing({ ageMinutes: 30, payoutId: "pout_r1" });
    gw.fetchPayout.mockResolvedValue({ id: "pout_r1", status: "processed", reference_id: p.record.id });
    const r = await reconcileProcessingPayouts();
    expect(r.checked).toBeGreaterThanOrEqual(1);
    expect(gw.fetchPayout).toHaveBeenCalledWith("pout_r1");
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
  });

  it("reconcile: old record with no payout id is re-sent with the same idempotency key", async () => {
    const p = await processing({ ageMinutes: 30 });
    gw.createPayout.mockResolvedValue({ id: "pout_r2", status: "processed", reference_id: p.record.id });
    await reconcileProcessingPayouts();
    expect(gw.createPayout.mock.calls[0][0].idempotencyKey).toBe(p.record.id);
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
  });

  it("reconcile: a young record (under 10 min) is left alone", async () => {
    const p = await processing({ ageMinutes: 1 });
    await reconcileProcessingPayouts();
    expect(gw.createPayout).not.toHaveBeenCalled();
    expect(gw.fetchPayout).not.toHaveBeenCalled();
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });
});

describe("RazorpayX webhook route gate", () => {
  const post = async (body: string, sig?: string) => {
    const { POST } = await import("@/app/api/webhooks/razorpayx/route");
    return POST(
      new Request("http://localhost/api/webhooks/razorpayx", {
        method: "POST",
        body,
        headers: sig === undefined ? {} : { "x-razorpay-signature": sig },
      }),
    );
  };

  it("missing signature -> 400", async () => {
    expect((await post("{}")).status).toBe(400);
  });
  it("wrong signature -> 400", async () => {
    expect((await post("{}", "deadbeef")).status).toBe(400);
  });
  it("tampered body (signature of a different body) -> 400", async () => {
    expect((await post('{"event":"payout.processed"}', sign("{}"))).status).toBe(400);
  });
  it("signed but not JSON -> 400", async () => {
    expect((await post("not json", sign("not json"))).status).toBe(400);
  });
  it("signed, not a payout event -> 200 ignored", async () => {
    const b = JSON.stringify({ event: "account.updated" });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
  });
  it("signed payout.processed for a real record -> settles it", async () => {
    const p = await processing();
    const b = JSON.stringify({
      event: "payout.processed",
      payload: { payout: { entity: { id: "pout_wh", status: "processed", reference_id: p.record.id, utr: "UWH" } } },
    });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
    // delivered twice: still one payment, still 200
    expect((await post(b, sign(b))).status).toBe(200);
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });
  it("signed payout.processed for an unknown record -> 200 (no retry storm), nothing created", async () => {
    const b = JSON.stringify({
      event: "payout.processed",
      payload: { payout: { entity: { id: "pout_ghost", status: "processed", reference_id: "ghost" } } },
    });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("UNKNOWN_RECORD");
  });
});