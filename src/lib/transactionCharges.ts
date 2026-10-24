import { round2 } from "@/lib/money";

/**
 * Charges added on top of what a parent owes (Oct 24, 2026, per direct
 * request). Pure functions only — no `server-only`, so the client's
 * payment-method prompt and the server price with the SAME code.
 *
 *   GST ............ 18% of the base amount, on every payment.
 *   Transaction .... UPI only, on the amount about to be paid
 *                    (base + international surcharge + GST):
 *                      up to  ₹2,000 ........ free
 *                      ₹2,000 – ₹75,000 ..... 0.4%
 *                      above ₹75,000 ........ flat ₹300
 *
 * The parent chooses UPI or "other" BEFORE the Razorpay order is created
 * (the order amount can't change afterwards). Verify / webhook can't see
 * that choice in the order notes (Razorpay caps notes at 15 and the
 * enrollment order is full), so they accept either amount — see
 * `matchPaidAmount()`.
 */
export const GST_RATE_PCT = 18;
export const UPI_FREE_UP_TO = 2000;
export const UPI_PCT_UP_TO = 75000;
export const UPI_PCT = 0.4;
export const UPI_FLAT_ABOVE = 300;

export type PaymentMethodChoice = "UPI" | "OTHER";

/** Anything that isn't exactly "UPI" is "OTHER" (card, netbanking…), so a missing field never adds a fee. */
export function parsePaymentMethod(value: unknown): PaymentMethodChoice {
  return value === "UPI" ? "UPI" : "OTHER";
}

export function gstOn(baseAmount: number): number {
  return baseAmount > 0 ? round2(baseAmount * (GST_RATE_PCT / 100)) : 0;
}

/** UPI transaction charge for a payment of `amount` rupees (the amount before this charge). */
export function upiFeeOn(amount: number): number {
  if (!(amount > UPI_FREE_UP_TO)) return 0;
  if (amount <= UPI_PCT_UP_TO) return round2(amount * (UPI_PCT / 100));

  return UPI_FLAT_ABOVE;
}

/** Adds the UPI charge (if the parent chose UPI) to the amount about to be charged. */
export function addTransactionCharge(
  amountBeforeCharge: number,
  method: PaymentMethodChoice,
): { transactionCharge: number; total: number } {
  const transactionCharge = method === "UPI" ? upiFeeOn(amountBeforeCharge) : 0;

  return { transactionCharge, total: round2(amountBeforeCharge + transactionCharge) };
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

/**
 * Did Razorpay charge what we expected? `expectedRupees` is the amount
 * BEFORE any UPI charge; an order created for UPI is that plus
 * `upiFeeOn(expected)`. Returns the transaction charge that was actually
 * included so callers can store it.
 */
export function matchPaidAmount(
  orderPaise: number,
  expectedRupees: number,
): { ok: boolean; transactionCharge: number } {
  if (orderPaise === toPaise(expectedRupees)) {
    return { ok: true, transactionCharge: 0 };
  }

  const fee = upiFeeOn(expectedRupees);

  if (fee > 0 && orderPaise === toPaise(round2(expectedRupees + fee))) {
    return { ok: true, transactionCharge: fee };
  }

  return { ok: false, transactionCharge: 0 };
}
