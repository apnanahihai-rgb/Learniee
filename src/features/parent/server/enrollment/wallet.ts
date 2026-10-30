import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyEnrollmentCreated } from "@/features/shared/server/notificationTriggers.service";
import { processReferralRewardForNewEnrollment } from "@/features/shared/server/referral.service";
import { debitWalletInTx } from "@/features/shared/server/wallet/core";
import { prisma } from "@/lib/prisma";
import { InvoiceType, Prisma } from "@prisma/client";
import "server-only";
import { buildEnrollmentCreateData } from "./notes";
import { priceEnrollment } from "./pricing";
import { CreateEnrollmentInput, EnrollmentError } from "./types";

/** Client-generated id (crypto.randomUUID()) that makes a retried request idempotent. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

export interface WalletEnrollmentInput extends CreateEnrollmentInput {
  requestId: string;
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Pays an Enrollment's first cycle from the Parent's Wallet (06 #44).
 *
 * Same pricing and same Enrollment/cycle/chat-room write as the Razorpay path
 * (`buildEnrollmentCreateData`), with three differences:
 *   - the WHOLE price must be covered by the balance (no part-wallet / part-card);
 *   - no international surcharge is added — the surcharge covers card fees and
 *     nothing is charged to a card here (06 #82);
 *   - the Enrollment and the wallet DEBIT are written in ONE transaction, so
 *     either both happen or neither does.
 *
 * Idempotent on `requestId`: it is stored as the Enrollment's (unique)
 * `razorpayOrderId` / `razorpayPaymentId` as `wallet_enr_…`, so a double click
 * or a retried request returns the Enrollment already created and never
 * debits twice.
 */
export async function payEnrollmentWithWallet(
  parentId: string,
  input: WalletEnrollmentInput,
) {
  if (typeof input.requestId !== "string" || !REQUEST_ID_PATTERN.test(input.requestId)) {
    throw new EnrollmentError("Missing or invalid requestId.", 400);
  }

  const orderRef = `wallet_enr_${input.requestId}`;
  const paymentRef = `wallet_enr_pay_${input.requestId}`;

  const findExisting = () =>
    prisma.enrollment.findUnique({
      where: { razorpayOrderId: orderRef },
      include: { chatRoom: { select: { id: true } } },
    });

  const existing = await findExisting();

  if (existing) {
    if (existing.parentId !== parentId) {
      throw new EnrollmentError("This request belongs to another account.", 403);
    }

    return existing;
  }

  const priced = await priceEnrollment(parentId, input, {
    model: "CYCLE_V1",
    enforceStartNotPast: true,
    enforceAvailability: true,
  });

  const walletPriced = {
    ...priced,
    amountPayable: priced.totalAmount,
    isInternationalPayment: false,
    internationalSurchargeAmount: 0,
    // The Wallet was GST-paid when it was topped up — nothing more to add.
    gstAmount: 0,
    transactionChargeAmount: 0,
  };

  let enrollment;

  try {
    enrollment = await prisma.$transaction(
      async (tx) => {
        const created = await tx.enrollment.create({
          data: buildEnrollmentCreateData({
            parentId,
            input,
            priced: walletPriced,
            orderId: orderRef,
            paymentId: paymentRef,
          }),
          include: { chatRoom: { select: { id: true } } },
        });

        // Throws WalletError(402) when the balance is too low; that rolls the
        // Enrollment back with it.
        await debitWalletInTx(tx, {
          parentId,
          amount: walletPriced.amountPayable,
          reason: `Enrollment payment${priced.subject ? ` — ${priced.subject}` : ""}`,
          referenceType: "ENROLLMENT_PAYMENT",
          referenceId: created.id,
        });

        return created;
      },
      { timeout: 15_000 },
    );
  } catch (err) {
    // A concurrent request with the same requestId won the unique constraint.
    if (isUniqueViolation(err)) {
      const winner = await findExisting();

      if (winner && winner.parentId === parentId) {
        return winner;
      }
    }

    throw err;
  }

  // Same non-fatal follow-ups as the Razorpay path.
  try {
    await processReferralRewardForNewEnrollment(parentId, enrollment.id);
  } catch (err) {
    console.error("Referral reward processing failed (enrollment still succeeded):", err);
  }

  await notifyEnrollmentCreated(enrollment.id);

  try {
    await generateInvoiceForPayment({
      type: InvoiceType.ENROLLMENT_PAYMENT,
      payerId: parentId,
      amount: Number(enrollment.amountPaid),
      description: `Enrollment payment (wallet)${priced.subject ? ` — ${priced.subject}` : ""}`,
      referenceType: "ENROLLMENT",
      referenceId: enrollment.id,
    });
  } catch (err) {
    console.error("Invoice generation failed (wallet enrollment still succeeded):", err);
  }

  return enrollment;
}
