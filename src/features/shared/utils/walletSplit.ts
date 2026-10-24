import { priceWithInternationalSurcharge } from "@/lib/internationalPayments";
import { round2 } from "@/lib/money";

/** Smallest card charge we ever create (Razorpay's own minimum is ₹1). */
export const MIN_CARD_CHARGE = 1;

export interface WalletSplit {
  /** Taken from the Wallet. */
  walletAmount: number;
  /** The part of the base price left for the card, before any surcharge. */
  cardBase: number;
  /** International surcharge — charged on the CARD part only (it covers card fees). */
  surchargeAmount: number;
  /** GST on the card part only (the wallet part was GST-paid when it was topped up). */
  gstAmount: number;
  /** What the card is actually charged: `cardBase + surchargeAmount + gstAmount` (before any UPI charge). */
  cardCharge: number;
  isInternationalPayment: boolean;
}

/**
 * Splits a base price between the Wallet and a card (06 #44 part payment).
 *
 * The same function is used when the order is created and when it is
 * verified / reconciled by the webhook, so the amounts can never drift.
 *
 * - The wallet part is clamped to `[0, totalAmount]`.
 * - If the wallet would leave a card remainder under ₹1, the wallet part is
 *   reduced so the card is charged exactly ₹1 (Razorpay can't charge less).
 * - `cardBase === 0` means the wallet covers everything — callers should use
 *   the wallet-only endpoint instead of creating a Razorpay order.
 */
export function splitWalletPayment(args: {
  totalAmount: number;
  isInternational: boolean;
  requestedWalletAmount: number;
}): WalletSplit {
  const total = round2(args.totalAmount);
  let wallet = round2(Math.min(Math.max(args.requestedWalletAmount || 0, 0), total));
  let cardBase = round2(total - wallet);

  if (cardBase > 0 && cardBase < MIN_CARD_CHARGE) {
    wallet = total >= MIN_CARD_CHARGE ? round2(total - MIN_CARD_CHARGE) : 0;
    cardBase = round2(total - wallet);
  }

  const card = priceWithInternationalSurcharge(
    cardBase,
    args.isInternational && cardBase > 0,
  );

  return {
    walletAmount: wallet,
    cardBase,
    surchargeAmount: card.surchargeAmount,
    gstAmount: card.gstAmount,
    cardCharge: card.amountPayable,
    isInternationalPayment: card.isInternationalPayment,
  };
}

/** `notes.walletAmount` from a Razorpay order we created; 0 when absent or invalid. */
export function walletAmountFromNotes(notes: Record<string, unknown>): number {
  const value = Number(notes.walletAmount);

  return Number.isFinite(value) && value > 0 ? round2(value) : 0;
}
