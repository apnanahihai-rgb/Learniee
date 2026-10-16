import { logActivity } from "@/features/shared/server/activityLog.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyCycleRenewed } from "@/features/shared/server/notificationTriggers.service";
import { debitWalletInTx } from "@/features/shared/server/wallet/core";
import { buildCyclePlan } from "@/features/shared/utils/cyclePlan";
import { prisma } from "@/lib/prisma";
import { InvoiceType } from "@prisma/client";
import "server-only";
import { createRenewalCycleInTx, findCycleForPayment, isUniqueViolation } from "./apply";
import { RenewalError, RenewalInput, buildRenewalPlan, loadRenewableEnrollment } from "./plan";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

export interface WalletRenewalInput extends RenewalInput {
  requestId: string;
}

/**
 * Pays a renewal (the next cycle) from the Parent's Wallet (06 #44).
 *
 * Same plan, same cycle + sessions write (`createRenewalCycleInTx`) as the
 * Razorpay renewal, with the whole `totalAmount` taken from the Wallet in the
 * SAME transaction (no international surcharge — no card is charged, 06 #82).
 *
 * Idempotent on `requestId`: the cycle's `paymentReference` is
 * `wallet_ren_<requestId>`, the same key `findCycleForPayment` uses for
 * Razorpay payments, so a retry returns the cycle already created.
 */
export async function renewWithWallet(
  enrollmentId: string,
  parentId: string,
  input: WalletRenewalInput,
) {
  if (typeof input.requestId !== "string" || !REQUEST_ID_PATTERN.test(input.requestId)) {
    throw new RenewalError("Missing or invalid requestId.", 400);
  }

  const paymentRef = `wallet_ren_${input.requestId}`;

  const existing = await findCycleForPayment(paymentRef);

  if (existing) {
    if (existing.enrollmentId !== enrollmentId) {
      throw new RenewalError("This request belongs to another enrollment.", 409);
    }

    return { cycle: existing, created: false };
  }

  const plan = await buildRenewalPlan(enrollmentId, parentId, {
    scheduleDays: input.scheduleDays,
    scheduleTime: input.scheduleTime,
    customDates: input.customDates,
  });

  const { enrollment } = await loadRenewableEnrollment(enrollmentId, parentId);

  const cyclePlan = buildCyclePlan(
    plan.cycleStartKey,
    plan.scheduleDays,
    enrollment.planType,
    plan.customDates,
  );

  if (!cyclePlan) {
    throw new RenewalError("Couldn't rebuild this renewal's cycle — try again.", 500);
  }

  let cycle;

  try {
    cycle = await prisma.$transaction(
      async (tx) => {
        const created = await createRenewalCycleInTx(tx, {
          enrollmentId,
          cycleNumber: plan.nextCycleNumber,
          startDate: new Date(plan.cycleStartKey),
          plan: cyclePlan,
          ratePerSession: enrollment.ratePerSession,
          totalAmount: plan.totalAmount,
          paymentReference: paymentRef,
          scheduleDays: plan.scheduleDays,
          scheduleTime: plan.scheduleTime,
        });

        // Throws WalletError(402) when the balance is too low; that rolls the
        // new cycle back with it.
        await debitWalletInTx(tx, {
          parentId,
          amount: plan.totalAmount,
          reason: `Cycle ${plan.nextCycleNumber} renewal${
            enrollment.subject ? ` — ${enrollment.subject}` : ""
          }`,
          referenceType: "ENROLLMENT_CYCLE",
          referenceId: created.id,
        });

        return created;
      },
      { timeout: 15_000 },
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      const winner = await findCycleForPayment(paymentRef);

      if (winner && winner.enrollmentId === enrollmentId) {
        return { cycle: winner, created: false };
      }

      // The next cycle number is already taken by a different payment.
      throw new RenewalError(
        "This enrollment was already renewed for its next cycle.",
        409,
      );
    }

    throw err;
  }

  try {
    await generateInvoiceForPayment({
      type: InvoiceType.CYCLE_RENEWAL_PAYMENT,
      payerId: parentId,
      amount: plan.totalAmount,
      description: `Cycle ${plan.nextCycleNumber} renewal (wallet)${
        enrollment.subject ? ` — ${enrollment.subject}` : ""
      }`,
      referenceType: "ENROLLMENT_CYCLE",
      referenceId: cycle.id,
    });
  } catch (err) {
    console.error("Invoice generation failed (wallet renewal still succeeded):", err);
  }

  try {
    await notifyCycleRenewed(enrollmentId, plan.nextCycleNumber);

    await logActivity({
      action: "CYCLE_RENEWED",
      actorRole: "PARENT",
      actorId: parentId,
      description: `Enrollment ${enrollmentId} renewed for cycle ${plan.nextCycleNumber} (${plan.sessionCount} sessions) from the Wallet.`,
      metadata: { enrollmentId, cycleNumber: plan.nextCycleNumber, sessionCount: plan.sessionCount, paidWith: "WALLET" },
    });
  } catch (err) {
    console.error("Post-renewal notify/log failed (renewal still succeeded):", err);
  }

  return { cycle, created: true };
}
