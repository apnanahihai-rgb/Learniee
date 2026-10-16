import {
    getRazorpayClient,
    rupeesToPaise
} from "@/lib/razorpay";
import { getOrCreateWallet } from "@/features/shared/server/wallet/core";
import { customDateOffsets } from "@/features/shared/utils/cyclePlan";
import { splitWalletPayment } from "@/features/shared/utils/walletSplit";
import { priceEnrollment } from './pricing';
import { CYCLE_MODEL_TAG, CreateEnrollmentInput, EnrollmentError } from './types';

/**
 * Step 1 of the paid-enrollment flow. Validates + prices the
 * enrollment exactly like before, but instead of writing an
 * Enrollment row, creates a Razorpay Order for `totalAmount` (in
 * INR — see src/lib/razorpay.ts for why no forex math happens on
 * our side) and returns it for the client to open Razorpay
 * Checkout against.
 *
 * DECIDED (resolves 06-OPEN-DECISIONS.md #36): Enrollment creation
 * now blocks on payment — no Enrollment row exists until
 * `verifyEnrollmentPayment()` confirms the charge. Nothing is
 * written to the DB here, so an abandoned checkout just leaves no
 * trace instead of a stray unpaid row.
 */
export async function createEnrollmentOrder(
  parentId: string,
  input: CreateEnrollmentInput,
  options: { useWallet?: boolean } = {},
) {
  const priced = await priceEnrollment(parentId, input, {
    model: "CYCLE_V1",
    enforceStartNotPast: true,
  });

  // Part payment (06 #44): the Wallet pays as much as it can and the card
  // pays the rest, with the international surcharge on the card part only.
  let walletAmount = 0;
  let cardCharge = priced.amountPayable;
  let cardSurcharge = priced.internationalSurchargeAmount;

  if (options.useWallet) {
    const wallet = await getOrCreateWallet(parentId);

    const split = splitWalletPayment({
      totalAmount: priced.totalAmount,
      isInternational: priced.isInternationalPayment,
      requestedWalletAmount: Number(wallet.balance),
    });

    if (split.cardBase <= 0) {
      throw new EnrollmentError(
        "Your wallet covers the whole price — use \"Pay from wallet\" instead.",
        400,
      );
    }

    walletAmount = split.walletAmount;
    cardCharge = split.cardCharge;
    cardSurcharge = split.surchargeAmount;
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    // Charges the surcharge-inclusive amount for international
    // parents — see src/lib/internationalPayments.ts. Domestic
    // parents get amountPayable === totalAmount, unchanged.
    amount: rupeesToPaise(cardCharge),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `enr_${Date.now()}`,
    // Full enough to reconstruct the Enrollment from the webhook
    // alone (src/app/api/webhooks/razorpay/route.ts) if the client
    // never calls /verify — e.g. tab closed right after paying.
    notes: {
      kind: "enrollment",
      parentId,
      studentId: priced.studentId,
      teacherId: input.teacherId,
      courseId: input.courseId,
      subject: priced.subject ?? "",
      model: CYCLE_MODEL_TAG,
      planType: priced.planType,
      // "YYYY-MM-DD" in the platform timezone; the session count is
      // re-derived from it + scheduleDays, never trusted from here.
      cycleStartDate: priced.cycleStartKey ?? "",
      sessionCount: priced.sessionsPerMonth,
      sessionLengthMinutes: priced.sessionLengthMinutes ?? 0,
      scheduleDays: JSON.stringify(priced.scheduleDays),
      scheduleTime: priced.scheduleTime,
      // Part payment: how much of the total was taken from the Wallet (0 = none).
      walletAmount,
      // "Complete month plan": the hand-picked dates as day offsets from
      // `cycleStartDate` (Razorpay caps a note at 256 chars). Only present
      // for custom plans; 15 notes is Razorpay's maximum, so nothing else
      // may be added to this object without dropping a key.
      ...(priced.customDateKeys.length > 0
        ? {
            customOffsets: JSON.stringify(
              customDateOffsets(priced.cycleStartKey ?? "", priced.customDateKeys),
            ),
          }
        : {}),
    },
  });

  return {
    order,
    pricing: { ...priced, walletAmount, amountPayable: cardCharge, internationalSurchargeAmount: cardSurcharge },
  };
}
export interface VerifyEnrollmentPaymentInput extends CreateEnrollmentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
