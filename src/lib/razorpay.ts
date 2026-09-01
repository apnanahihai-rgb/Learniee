import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Server-only Razorpay helpers. Never import this from a Client
 * Component — `RAZORPAY_KEY_SECRET` must never reach the browser.
 * `RAZORPAY_KEY_ID` itself is not secret (it's the public half of
 * the pair), so the order-creation API routes return it alongside
 * the order so the client never needs its own copy of the env var.
 *
 * Currency/forex note (per direct request): Learniee only ever
 * creates orders in INR — every price in the product (Course.price,
 * the flat ₹100 demo fee) is an INR amount, and that's what we ask
 * Razorpay to charge. We do NOT compute or add any forex/markup
 * ourselves. A parent paying with a non-Indian card still gets
 * charged this exact INR amount; their own card network/issuing
 * bank does the currency conversion and applies whatever forex fee
 * their bank charges — that cost lands on them automatically, we
 * never see or touch it. The only thing required on our side for
 * non-Indian cards to work at all is enabling "International
 * Payments" in the Razorpay Dashboard (Account & Settings ->
 * Configuration) — that's a dashboard toggle + KYC step, not code.
 */

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

let cachedClient: Razorpay | null = null;

/** Lazily-constructed singleton so a missing env var only throws
 * when a payment route is actually hit, not at build/import time. */
export function getRazorpayClient(): Razorpay {
  if (!cachedClient) {
    cachedClient = new Razorpay({
      key_id: getEnv("RAZORPAY_KEY_ID"),
      key_secret: getEnv("RAZORPAY_KEY_SECRET"),
    });
  }

  return cachedClient;
}

/** Razorpay takes amounts in the smallest currency unit — paise for
 * INR. All Learniee amounts are `Decimal(10,2)` rupees; convert at
 * the boundary, right before calling Razorpay, never earlier. */
export function rupeesToPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

function safeHmacEquals(secret: string, payload: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  // timingSafeEqual throws on length mismatch instead of returning
  // false — guard that so a malformed signature is just "invalid"
  // instead of a 500.
  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Verifies the `razorpay_signature` returned to the browser after
 * Razorpay Checkout succeeds (HMAC-SHA256 of `order_id|payment_id`,
 * keyed with the account's key secret — the standard client-side
 * checkout verification per Razorpay's docs). This proves the
 * order/payment pair wasn't tampered with in transit, but does NOT
 * by itself prove the payment was actually captured — callers
 * should still fetch the order/payment from Razorpay's API before
 * trusting the amount (done in the enrollment/demo verify routes).
 */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getEnv("RAZORPAY_KEY_SECRET");
  return safeHmacEquals(secret, `${params.orderId}|${params.paymentId}`, params.signature);
}

/**
 * Verifies a Razorpay webhook payload's `X-Razorpay-Signature`
 * header against the raw request body, keyed with the separate
 * webhook secret configured in the Razorpay Dashboard (Settings ->
 * Webhooks) — NOT the same value as `RAZORPAY_KEY_SECRET`.
 */
export function verifyWebhookSignature(params: { rawBody: string; signature: string }): boolean {
  const secret = getEnv("RAZORPAY_WEBHOOK_SECRET");
  return safeHmacEquals(secret, params.rawBody, params.signature);
}
