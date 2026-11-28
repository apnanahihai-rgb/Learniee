import "server-only";

import {
  ActivityActorRole,
  CommunityPaymentStatus,
  CommunityStatus,
  InvoiceType,
  Prisma,
} from "@prisma/client";

import { logActivity } from "@/features/shared/server/activityLog.service";
import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { isInternationalParent, priceWithInternationalSurcharge } from "@/lib/internationalPayments";
import { round2 } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, rupeesToPaise, verifyCheckoutSignature } from "@/lib/razorpay";
import { addTransactionCharge, matchPaidAmount, type PaymentMethodChoice } from "@/lib/transactionCharges";
import { displayName } from "@/features/shared/utils/displayName";

import { CommunityError } from "./community.service";

/**
 * Community, Part 3 (paid communities, Dec 2026).
 *
 * A Parent pays once to join a paid community. Same two-step shape as demo
 * coupons, wallet top-ups and enrollments:
 *
 *   1. `createCommunityPaymentOrder`  writes nothing. It prices the community
 *      (international surcharge + 18% GST, then the UPI charge if the Parent
 *      chose UPI) and creates a Razorpay Order. Everything the later steps need
 *      is stamped into the order's `notes`, so verify / webhook never trust a
 *      client-sent amount, and a price change by Admin mid-checkout cannot make
 *      a captured payment fail.
 *   2. `verifyCommunityPayment`       re-checks the checkout signature, re-fetches
 *      the order from Razorpay, and records the payment + membership.
 *   3. `reconcileCommunityPaymentFromWebhook` is the same recording for a client
 *      that never called verify (closed tab, dropped network).
 *
 * Recording is ONE transaction (CommunityPayment row + CommunityMember row), then
 * the Invoice (the Payments page receipt) and an Activity Log line. Both
 * recorders are idempotent on `razorpayOrderId`.
 *
 * Refunds go through the existing refund request: a FULL refund flips the payment
 * to REFUNDED and removes the membership (`communityRefund.service.ts`).
 */

const NOTE_KIND = "community_payment";

type RazorpayOrder = { id: string; amount: number | string; notes?: unknown };

/* -------------------------------- Step 1: order -------------------------------- */

export async function createCommunityPaymentOrder(
  communityId: string,
  parentId: string,
  paymentMethod: PaymentMethodChoice = "OTHER",
) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, status: CommunityStatus.ACTIVE },
  });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  if (!community.isPaid || community.price === null) {
    throw new CommunityError("This community is free. Join it directly.");
  }

  const price = Number(community.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new CommunityError("This community has no valid price yet. Please try again later.", 409);
  }

  const member = await prisma.communityMember.findUnique({
    where: { communityId_parentId: { communityId, parentId } },
    select: { id: true },
  });

  if (member) {
    throw new CommunityError("You have already joined this community.", 409);
  }

  const alreadyPaid = await prisma.communityPayment.findFirst({
    where: { communityId, parentId, status: CommunityPaymentStatus.PAID },
    select: { id: true },
  });

  if (alreadyPaid) {
    throw new CommunityError("You have already paid for this community. Tap Join to get back in, no new payment needed.", 409);
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const pricing = priceWithInternationalSurcharge(price, parent ? isInternationalParent(parent) : false);
  const { transactionCharge, total: payNow } = addTransactionCharge(pricing.amountPayable, paymentMethod);

  const order = await getRazorpayClient().orders.create({
    amount: rupeesToPaise(payNow),
    currency: "INR",
    // Razorpay caps receipt at 40 chars.
    receipt: `com_${Date.now()}`,
    notes: {
      kind: NOTE_KIND,
      parentId,
      communityId,
      // Rupees, all server-computed. `payableRupees` is what the order was
      // priced at BEFORE any UPI charge; verify matches the paid amount to it.
      priceRupees: String(price),
      surchargeRupees: String(pricing.surchargeAmount),
      gstRupees: String(pricing.gstAmount),
      payableRupees: String(pricing.amountPayable),
      transactionChargeRupees: String(transactionCharge),
    },
  });

  return { order, totalPayable: payNow, communityTitle: community.title };
}

/* ------------------------------- Recording (shared) ------------------------------ */

function noteNumber(notes: Record<string, unknown>, key: string): number {
  const value = Number(notes[key]);

  return Number.isFinite(value) ? value : NaN;
}

/**
 * Turns a PAID Razorpay order into a CommunityPayment + CommunityMember (and
 * the Invoice). Returns null if the order is not a community payment. Throws
 * `CommunityError` if it is one but the amount does not match.
 *
 * The community does not have to be visible any more: if the money was taken,
 * the Parent gets in even when Admin hid the community meanwhile.
 */
async function recordPaidOrder(order: RazorpayOrder, razorpayPaymentId: string, expectedParentId?: string) {
  const notes = (order.notes && typeof order.notes === "object" ? order.notes : {}) as Record<string, unknown>;

  if (notes.kind !== NOTE_KIND) {
    return null;
  }

  const parentId = String(notes.parentId ?? "");
  const communityId = String(notes.communityId ?? "");
  const price = noteNumber(notes, "priceRupees");
  const payable = noteNumber(notes, "payableRupees");
  const gst = noteNumber(notes, "gstRupees");
  const surcharge = noteNumber(notes, "surchargeRupees");

  if (!parentId || !communityId || !(price > 0) || !(payable > 0) || Number.isNaN(gst) || Number.isNaN(surcharge)) {
    console.error("Community payment order has missing or invalid notes:", order.id);

    throw new CommunityError("This payment could not be matched to a community. Contact support with your payment ID.", 409);
  }

  if (expectedParentId && expectedParentId !== parentId) {
    throw new CommunityError("This payment belongs to a different account.", 403);
  }

  const paid = matchPaidAmount(Number(order.amount), payable);

  if (!paid.ok) {
    console.error("Community payment amount mismatch:", order.id);

    throw new CommunityError(
      "The paid amount doesn't match the community price. Contact support with your payment ID for a refund.",
      409,
    );
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, title: true },
  });

  if (!community) {
    throw new CommunityError("Community not found. Contact support with your payment ID for a refund.", 404);
  }

  const amountPaid = round2(payable + paid.transactionCharge);

  let payment;

  try {
    payment = await prisma.$transaction(async (tx) => {
      const created = await tx.communityPayment.create({
        data: {
          communityId,
          parentId,
          price,
          gstAmount: gst,
          internationalSurchargeAmount: surcharge,
          transactionChargeAmount: paid.transactionCharge,
          amountPaid,
          razorpayOrderId: order.id,
          razorpayPaymentId,
        },
      });

      // Join automatically. skipDuplicates: harmless if the Parent is somehow
      // already a member (e.g. two tabs paid).
      await tx.communityMember.createMany({
        data: [{ communityId, parentId }],
        skipDuplicates: true,
      });

      return created;
    });
  } catch (err) {
    // Verify and the webhook can arrive together: the unique order id makes the
    // second one fail. That is the same payment, so return the first row.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.communityPayment.findUnique({ where: { razorpayOrderId: order.id } });

      if (existing) return existing;
    }

    throw err;
  }

  // The receipt must never undo a payment that already went through.
  try {
    await generateInvoiceForPayment({
      type: InvoiceType.COMMUNITY_PAYMENT,
      payerId: parentId,
      amount: amountPaid,
      description: `Community: ${community.title}`,
      referenceType: "COMMUNITY_PAYMENT",
      referenceId: payment.id,
      razorpayOrderId: order.id,
      razorpayPaymentId,
    });
  } catch (err) {
    console.error("Invoice generation failed (community payment still succeeded):", err);
  }

  await logActivity({
    action: "PAYMENT_COMMUNITY",
    actorRole: ActivityActorRole.PARENT,
    actorId: parentId,
    description: `Community payment received — "${community.title}" for ₹${amountPaid} (Payment ${payment.id}).`,
    metadata: {
      communityId,
      paymentId: payment.id,
      amount: amountPaid,
      razorpayPaymentId,
    },
  });

  return payment;
}

/* ------------------------------- Step 2: verify -------------------------------- */

export interface VerifyCommunityPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyCommunityPayment(
  communityId: string,
  parentId: string,
  input: VerifyCommunityPaymentInput,
) {
  const existing = await prisma.communityPayment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    if (existing.parentId !== parentId || existing.communityId !== communityId) {
      throw new CommunityError("This payment belongs to a different account.", 403);
    }

    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new CommunityError(
      "Payment verification failed. If money was deducted, it will be auto-refunded. Contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const order = await getRazorpayClient().orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new CommunityError(`Payment isn't complete yet (status: ${order.status}). Please retry the payment.`, 402);
  }

  const notes = (order.notes && typeof order.notes === "object" ? order.notes : {}) as Record<string, unknown>;

  if (String(notes.communityId ?? "") !== communityId) {
    throw new CommunityError("This payment is for a different community.", 409);
  }

  const payment = await recordPaidOrder(order, input.razorpayPaymentId, parentId);

  if (!payment) {
    throw new CommunityError("This payment is not a community payment.", 409);
  }

  return payment;
}

/* ------------------------------- Webhook fallback ------------------------------ */

/**
 * Same job as `reconcileDemoCouponPurchaseFromWebhook` and friends: catches a
 * payment that captured on Razorpay's side but whose client never called
 * verify. Returns null for an order that is not a community payment (so the
 * webhook route falls through), or one that fails a re-check (logged here).
 */
export async function reconcileCommunityPaymentFromWebhook(orderId: string, paymentId: string) {
  const existing = await prisma.communityPayment.findUnique({ where: { razorpayOrderId: orderId } });

  if (existing) {
    return existing;
  }

  const order = await getRazorpayClient().orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  try {
    return await recordPaidOrder(order, paymentId);
  } catch (err) {
    if (err instanceof CommunityError) {
      console.error("Razorpay webhook: community payment re-check failed:", orderId, err.message);

      return null;
    }

    throw err;
  }
}

/* ----------------------------------- Admin ------------------------------------ */

/** Who paid for this community (paid and refunded), newest first, with totals. */
export async function listCommunityPayments(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  const rows = await prisma.communityPayment.findMany({
    where: { communityId },
    orderBy: { paidAt: "desc" },
    include: {
      parent: {
        select: { id: true, firstName: true, lastName: true, visibleName: true, email: true, phone: true },
      },
    },
  });

  const invoices = rows.length
    ? await prisma.invoice.findMany({
        where: { referenceType: "COMMUNITY_PAYMENT", referenceId: { in: rows.map((r) => r.id) } },
        select: { referenceId: true, invoiceNumber: true },
      })
    : [];

  const invoiceByPayment = new Map(invoices.map((i) => [i.referenceId, i.invoiceNumber]));

  const payments = rows.map((r) => ({
    id: r.id,
    parentId: r.parent.id,
    name: displayName(r.parent),
    email: r.parent.email,
    phone: r.parent.phone,
    price: Number(r.price),
    amountPaid: Number(r.amountPaid),
    status: r.status,
    paidAt: r.paidAt.toISOString(),
    refundedAt: r.refundedAt ? r.refundedAt.toISOString() : null,
    invoiceNumber: invoiceByPayment.get(r.id) ?? null,
  }));

  const paid = payments.filter((p) => p.status === CommunityPaymentStatus.PAID);

  return {
    payments,
    summary: {
      paidCount: paid.length,
      refundedCount: payments.length - paid.length,
      // What was charged for payments still standing (GST / UPI charge included).
      totalCollected: round2(paid.reduce((sum, p) => sum + p.amountPaid, 0)),
    },
  };
}
