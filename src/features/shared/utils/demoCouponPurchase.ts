/**
 * Bounds for "buy extra demo coupons ahead of time"
 * (06-OPEN-DECISIONS.md #26's paid path, extended) — distinct from
 * the flat ₹100 per-demo charge that fires automatically once the
 * free coupons run out (see createDemoBookingOrder() in
 * demoCoupon.service.ts). Pulled into its own file (no server-only
 * imports), same reasoning as walletTopup.ts, so both
 * demoCoupon.service.ts (server) and the client-side
 * useDemoCoupons hook can import the same numbers without pulling
 * src/lib/razorpay.ts (which refuses to load outside a server
 * context) into the browser bundle.
 *
 * Placeholder bounds, not a confirmed spec — same status as
 * WALLET_TOPUP_MIN_AMOUNT/MAX_AMOUNT.
 */
export const DEMO_COUPON_PURCHASE_MIN_QTY = 1;
export const DEMO_COUPON_PURCHASE_MAX_QTY = 20;
