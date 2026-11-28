import { CommunityPaymentStatus, InvoiceType, Prisma } from "@prisma/client";
import "server-only";

/**
 * Refund vs paid community (Dec 2026, Part 3). Called from
 * `decideRefundRequest()` INSIDE the refund-approval transaction, the same way
 * `applyRefundToEnrollmentInTx` is, so the Wallet credit and the access change
 * commit together or not at all.
 *
 *   - FULL refund of a community payment: the payment becomes REFUNDED and the
 *     Parent is removed from the community. They can buy it again later.
 *   - PARTIAL refund: only the Wallet is credited; the Parent keeps access.
 *     Approve the full amount if their access should end.
 *   - Any other invoice type: nothing to do here.
 *
 * Returns plain-language lines for Admin, shown after the decision.
 */

type Tx = Prisma.TransactionClient;

export async function applyRefundToCommunityInTx(
  tx: Tx,
  input: {
    invoiceType: InvoiceType;
    invoiceReferenceId: string;
    fullyRefunded: boolean;
    now: Date;
  },
): Promise<{ notices: string[] }> {
  if (input.invoiceType !== InvoiceType.COMMUNITY_PAYMENT) {
    return { notices: [] };
  }

  const payment = await tx.communityPayment.findUnique({
    where: { id: input.invoiceReferenceId },
    include: { community: { select: { title: true } } },
  });

  if (!payment) {
    return {
      notices: ["The community payment record for this invoice was not found. Check the parent's access by hand."],
    };
  }

  const title = payment.community.title;

  if (!input.fullyRefunded) {
    return {
      notices: [
        `Partial refund: the parent keeps access to "${title}". Approve the full amount if their access should end.`,
      ],
    };
  }

  // Conditional update: a second refund decision for the same payment is a no-op.
  const flipped = await tx.communityPayment.updateMany({
    where: { id: payment.id, status: CommunityPaymentStatus.PAID },
    data: { status: CommunityPaymentStatus.REFUNDED, refundedAt: input.now },
  });

  if (flipped.count === 0) {
    return { notices: [] };
  }

  // Another standing payment for the same community (a double payment) still
  // earns the membership.
  const otherPaid = await tx.communityPayment.count({
    where: {
      communityId: payment.communityId,
      parentId: payment.parentId,
      status: CommunityPaymentStatus.PAID,
      id: { not: payment.id },
    },
  });

  if (otherPaid > 0) {
    return {
      notices: [`Refunded. The parent has another payment for "${title}", so they keep access.`],
    };
  }

  await tx.communityMember.deleteMany({
    where: { communityId: payment.communityId, parentId: payment.parentId },
  });

  return { notices: [`The parent was removed from "${title}".`] };
}
