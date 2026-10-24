import { debitWalletInTx } from "@/features/shared/server/wallet/core";
import { splitWalletPayment, walletAmountFromNotes } from "@/features/shared/utils/walletSplit";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import { EnrollmentError, type PricedEnrollment } from "./types";

/**
 * Part payment from the Wallet (06 #44). The order is created for the card
 * remainder only and stamps `notes.walletAmount`; this is the single place
 * verify and the webhook turn those notes back into amounts.
 *
 * With no `walletAmount` in the notes (every order before this feature, and
 * every normal card payment) it returns the price untouched, so the existing
 * flow is unchanged.
 */
export function applyWalletPortion(
  priced: PricedEnrollment,
  notes: Record<string, unknown>,
): {
  walletAmount: number;
  /** What Razorpay must have charged for this order. */
  cardCharge: number;
  /** `priced` with `amountPayable` = wallet + card (total money paid) and the card-only surcharge. */
  paidPriced: PricedEnrollment;
} {
  const walletAmount = walletAmountFromNotes(notes);

  if (walletAmount <= 0) {
    return { walletAmount: 0, cardCharge: priced.amountPayable, paidPriced: priced };
  }

  const split = splitWalletPayment({
    totalAmount: priced.totalAmount,
    isInternational: priced.isInternationalPayment,
    requestedWalletAmount: walletAmount,
  });

  if (split.walletAmount !== walletAmount || split.cardBase <= 0) {
    throw new EnrollmentError(
      "The wallet portion of this payment doesn't match the current price — contact support with your payment ID.",
      409,
    );
  }

  return {
    walletAmount,
    cardCharge: split.cardCharge,
    paidPriced: {
      ...priced,
      amountPayable: Math.round((walletAmount + split.cardCharge) * 100) / 100,
      isInternationalPayment: split.isInternationalPayment,
      internationalSurchargeAmount: split.surchargeAmount,
      gstAmount: split.gstAmount,
    },
  };
}

/**
 * Creates the paid Enrollment. With a wallet portion, the Enrollment and the
 * wallet debit are written in ONE transaction: if the balance was spent
 * elsewhere since the order was created, the debit fails and nothing is
 * created (the card payment then needs a manual refund, same as any other
 * captured-but-unappliable payment).
 */
export async function createPaidEnrollment(args: {
  data: Prisma.EnrollmentUncheckedCreateInput;
  parentId: string;
  walletAmount: number;
  subject: string | null;
}) {
  const include = { chatRoom: { select: { id: true } } } as const;

  if (args.walletAmount <= 0) {
    return prisma.enrollment.create({ data: args.data, include });
  }

  return prisma.$transaction(
    async (tx) => {
      const created = await tx.enrollment.create({ data: args.data, include });

      await debitWalletInTx(tx, {
        parentId: args.parentId,
        amount: args.walletAmount,
        reason: `Enrollment payment (part from wallet)${args.subject ? ` — ${args.subject}` : ""}`,
        referenceType: "ENROLLMENT_PAYMENT",
        referenceId: created.id,
      });

      return created;
    },
    { timeout: 15_000 },
  );
}
