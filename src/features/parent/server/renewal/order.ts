import {
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
    preview,
  };
}
export async function createRenewalOrder(
  enrollmentId: string,
  parentId: string,
  input: RenewalInput,
  options: { useWallet?: boolean } = {},
) {
  const plan = await buildRenewalPlan(enrollmentId, parentId, input);

  // Part payment (06 #44): Wallet first, card for the rest, with the
  // international surcharge on the card part only.
  let walletAmount = 0;
  let cardCharge = plan.amountPayable;
  let cardSurcharge = plan.internationalSurchargeAmount;

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
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(cardCharge),
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
    },
  });

  return {
    order: {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    },
    keyId: getRazorpayKeyId(),
    pricing: { ...plan, walletAmount, amountPayable: cardCharge, internationalSurchargeAmount: cardSurcharge },
  };
}
export interface VerifyRenewalPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
