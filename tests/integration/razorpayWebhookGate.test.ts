import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const SECRET = "whsec_test_secret";

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  process.env.RAZORPAY_MODE = "test";
  process.env.RAZORPAY_TEST_WEBHOOK_SECRET = SECRET;
  delete process.env.RAZORPAY_LIVE_WEBHOOK_SECRET;
  ({ POST } = await import("@/app/api/webhooks/razorpay/route"));
});

const sign = (body: string, secret = SECRET) => createHmac("sha256", secret).update(body).digest("hex");

function call(body: string, signature?: string) {
  return POST(
    new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: signature ? { "x-razorpay-signature": signature } : {},
      body,
    }),
  );
}

describe("Razorpay webhook gate", () => {
  it("missing signature -> 400", async () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect((await call(body)).status).toBe(400);
  });

  it("wrong signature -> 400", async () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect((await call(body, sign(body, "some-other-secret"))).status).toBe(400);
  });

  it("body changed after signing -> 400", async () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect((await call(body + " ", sign(body))).status).toBe(400);
  });

  it("signed but not JSON -> 400", async () => {
    const body = "not json";
    expect((await call(body, sign(body))).status).toBe(400);
  });

  it("signed, other event -> 200 ignored", async () => {
    const body = JSON.stringify({ event: "payment.failed" });
    const res = await call(body, sign(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, ignored: true });
  });

  it("signed payment.captured with no order/payment id -> 400", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {} } } });
    expect((await call(body, sign(body))).status).toBe(400);
  });
});