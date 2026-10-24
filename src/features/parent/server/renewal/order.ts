import { addTransactionCharge, type PaymentMethodChoice } from "@/lib/transactionCharges";
import {
    addDays,
    dateToCalendarDate,
    toDateKey,
    todayInPlatformTz
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import {
    getRazorpayClient,
    getRazorpayKeyId,
    rupeesToPaise
} from "@/lib/razorpay";
import { getOrCreateWallet } from "@/features/shared/server/wallet/core";
import { buildCyclePlan, customDateOffsets } from "@/features/shared/utils/cyclePlan";
import { splitWalletPayment } from "@/features/shared/utils/walletSplit";
import "server-only";
import { RenewalError, RenewalInput, RenewalPlan, buildRenewalPlan, isRenewalWindowOpen, loadRenewableEnrollment, renewalWindowOpensOn } from './plan';

/** GET-route helper: eligibility + a preview using the enrollment's current schedule. */
export async function getRenewalStatus(enrollmentId: string, parentId: string) {
  const { enrollment, latestCycle } = await loadRenewableEnrollment(enrollmentId, parentId);
  const today = todayInPlatformTz();
  const opensOn = renewalWindowOpensOn(latestCycle.endDate);
  const eligible = isRenewalWindowOpen(latestCycle.endDate, today);

  const alreadyRenewed = await prisma.enrollmentCycle.findFirst({
    where: { enrollmentId, cycleNumber: latestCycle.cycleNumber + 1 },
    select: { id: true },
  });

  const isCustomPlan = latestCycle.customDates.length > 0;
  const nextStartKey = toDateKey(addDays(dateToCalendarDate(latestCycle.endDate), 1));
  const nextWindow = buildCyclePlan(nextStartKey, [], enrollment.planType);

  let preview: RenewalPlan | null = null;

  if (eligible && !alreadyRenewed) {
    try {
      preview = await buildRenewalPlan(enrollmentId, parentId, {});
    } catch {
      // Falls through with preview: null — the order call surfaces
      // the real error if the parent actually tries to renew.
    }
  }

  return {
    eligible: eligible && !alreadyRenewed,
    alreadyRenewed: Boolean(alreadyRenewed),
    opensOn: toDateKey(opensOn),
    currentCycleNumber: latestCycle.cycleNumber,
    currentCycleEndDate: toDateKey(dateToCalendarDate(latestCycle.endDate)),
    currentScheduleDays: enrollment.scheduleDays,
    currentScheduleTime: enrollment.scheduleTime,
    /** True on the "Complete month plan": the next cycle's dates are picked one by one. */
    isCustomPlan,
    /** The next cycle's window, so the date picker knows what to show. */
    nextCycleStartKey: nextStartKey,
    nextCycleEndKey: nextWindow ? toDateKey(nextWindow.endDate) : nextStartKey,
    preview,
  };
}
export async function createRenewalOrder(
  enrollmentId: string,
  parentId: string,
  input: RenewalInput,
  options: { useWallet?: boolean; paymentMethod?: PaymentMethodChoice } = {},
) {
  const plan = await buildRenewalPlan(enrollmentId, parentId, input);

  // Part payment (06 #44): Wallet first, card for the rest, with the
  // international surcharge on the card part only.
  let walletAmount = 0;
  let cardCharge = plan.amountPayable;
  let cardSurcharge = plan.internationalSurchargeAmount;
  let cardGst = plan.gstAmount;

  if (options.useWallet) {
    const wallet = await getOrCreateWallet(parentId);

    const split = splitWalletPayment({
      totalAmount: plan.totalAmount,
      isInternational: plan.isInternationalPayment,
      requestedWalletAmount: Number(wallet.balance),
    });

    if (split.cardBase <= 0) {
      throw new RenewalError(
        'Your wallet covers the whole price — use "Pay from wallet" instead.',
        400,
      );
    }

    walletAmount = split.walletAmount;
    cardCharge = split.cardCharge;
    cardSurcharge = split.surchargeAmount;
    cardGst = split.gstAmount;
  }

  // UPI adds a transaction charge on top (see src/lib/transactionCharges.ts).
  const { transactionCharge, total: payNow } = addTransactionCharge(
    cardCharge,
    options.paymentMethod ?? "OTHER",
  );

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(payNow),
    currency: "INR",
    receipt: `ren_${Date.now()}`,
    notes: {
      kind: "cycle_renewal",
      enrollmentId,
      parentId,
      cycleNumber: plan.nextCycleNumber,
      cycleStartDate: plan.cycleStartKey,
      sessionCount: plan.sessionCount,
      scheduleDays: JSON.stringify(plan.scheduleDays),
      scheduleTime: plan.scheduleTime,
      // Part payment: how much of the total was taken from the Wallet (0 = none).
      walletAmount,
      // "Complete month plan": the hand-picked dates as day offsets from
      // `cycleStartDate` (notes values are capped at 256 chars). Absent
      // = repeating weekdays.
      ...(plan.customDates.length > 0
        ? {
            customOffsets: JSON.stringify(
              customDateOffsets(plan.cycleStartKey, plan.customDates),
            ),
          }
        : {}),
    },
  });

  return {
    order: {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    },
    keyId: getRazorpayKeyId(),
    pricing: {
      ...plan,
      walletAmount,
      amountPayable: payNow,
      internationalSurchargeAmount: cardSurcharge,
      gstAmount: cardGst,
      transactionChargeAmount: transactionCharge,
    },
  };
}
export interface VerifyRenewalPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
