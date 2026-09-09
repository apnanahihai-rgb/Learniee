import { prisma } from "@/lib/prisma";
import { WalletTransactionType } from "@prisma/client";
import {
  getRazorpayClient,
  rupeesToPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import {
  WALLET_TOPUP_MIN_AMOUNT,
  WALLET_TOPUP_MAX_AMOUNT,
} from "@/features/shared/utils/walletTopup";
import { notifyWalletCredited } from "@/features/shared/server/notificationTriggers.service";

/**
 * Wallet (06-OPEN-DECISIONS.md #28) — closed-loop credit ledger per
 * ParentProfile, no cash-out (money only ever leaves via future
 * spend, never a payout/withdrawal). Lazily created on first use,
 * same pattern as `DemoCoupon` (see `demoCoupon.service.ts`'s
 * `getOrCreateDemoCoupon()`) — no backfill migration needed for
 * ParentProfile rows that existed before this feature.
 *
 * Two ways money enters a Wallet:
 *  1. Accounts/Admin manually crediting via `creditWallet()`
 *     (`/api/accounts/wallet/credit`) — e.g. to fulfil a "contact
 *     support for a refund" promise made elsewhere in the app, since
 *     there's still no automatic refund-on-Enrollment-rejection flow
 *     and Razorpay refunds aren't wired up anywhere else.
 *  2. A parent topping up their own Wallet with a real Razorpay
 *     payment (`createWalletTopupOrder` / `verifyWalletTopup`,
 *     added Sep 7, 2026 — see `/api/parent/wallet/order` +
 *     `/verify`). This is a new capability, not something
 *     06-OPEN-DECISIONS.md #28 itself called for — it only decided
 *     the refund direction. Flagging rather than assuming it's fine
 *     to let parents fund a Wallet ahead of any actual refund.
 *
 * `debitWallet()` is included as the natural counterpart to both but
 * still has no caller anywhere — whether a Wallet balance can be
 * spent toward a future Enrollment/demo payment is still an open
 * question, not decided here.
 */

export class WalletError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getOrCreateWallet(parentId: string) {
  const existing = await prisma.wallet.findUnique({ where: { parentId } });

  if (existing) {
    return existing;
  }

  return prisma.wallet.create({
    data: { parentId, balance: 0 },
  });
}

export interface WalletAdjustmentInput {
  parentId: string;
  /** Always positive, in rupees — direction comes from which function is called. */
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  /** Cognito `sub` of the Admin/Accounts login issuing this, if manual. */
  createdByStaffSub?: string;
  /** Set only for a Razorpay-backed top-up — see createWalletTopupOrder/verifyWalletTopup. */
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

function assertValidAdjustment(input: WalletAdjustmentInput) {
  if (!input.parentId) {
    throw new WalletError("parentId is required.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new WalletError("Amount must be a positive number.");
  }

  if (!input.reason?.trim()) {
    throw new WalletError("A reason is required for every wallet transaction.");
  }
}

/**
 * Credits a parent's Wallet — the only way money enters a Wallet
 * today. Creates the Wallet row on first use, same as
 * getOrCreateWallet(). Runs inside a transaction so the balance
 * update and the WalletTransaction row can never drift apart.
 */
export async function creditWallet(input: WalletAdjustmentInput) {
  assertValidAdjustment(input);

  const result = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { parentId: input.parentId } });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { parentId: input.parentId, balance: 0 },
      });
    }

    // Decimal fields need an explicit Number(...) conversion before
    // Prisma writes (02-ARCHITECTURE.md's Prisma 7 gotcha — bit
    // Course.price once already).
    const balanceAfter = Number(wallet.balance) + input.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount: input.amount,
        balanceAfter,
        reason: input.reason.trim(),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdByStaffSub: input.createdByStaffSub,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      },
    });

    return { wallet: updatedWallet, transaction };
  });

  await notifyWalletCredited(input.parentId, input.amount, input.reason);

  return result;
}

/**
 * Debits a parent's Wallet. No caller exists yet anywhere in the
 * app (see file header) — kept here so a future "pay with wallet
 * balance" flow doesn't have to build the transactional balance
 * bookkeeping from scratch. Throws if the wallet doesn't exist yet
 * or doesn't have enough balance — a Wallet can never go negative.
 */
export async function debitWallet(input: WalletAdjustmentInput) {
  assertValidAdjustment(input);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { parentId: input.parentId } });

    if (!wallet || Number(wallet.balance) < input.amount) {
      throw new WalletError("Insufficient wallet balance for this debit.", 402);
    }

    const balanceAfter = Number(wallet.balance) - input.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amount: input.amount,
        balanceAfter,
        reason: input.reason.trim(),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdByStaffSub: input.createdByStaffSub,
      },
    });

    return { wallet: updatedWallet, transaction };
  });
}

/**
 * The shape the Parent-facing Wallet page needs: current balance
 * plus recent transaction history, most recent first.
 */
export async function getWalletSummaryForParent(parentId: string, limit = 50) {
  const wallet = await getOrCreateWallet(parentId);

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    balance: Number(wallet.balance),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      reason: t.reason,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    })),
  };
}

/**
 * Accounts/Admin-facing list — every ParentProfile with its Wallet
 * balance (0 for parents who've never had a Wallet row created
 * yet), so Accounts can find and credit ANY parent, not only ones
 * who already happen to have a Wallet row.
 */
export async function listParentWalletsForAccounts() {
  const parents = await prisma.parentProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      wallet: { select: { balance: true, updatedAt: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return parents.map((p) => ({
    parentId: p.id,
    parentName: `${p.firstName} ${p.lastName}`.trim(),
    email: p.email,
    balance: p.wallet ? Number(p.wallet.balance) : 0,
    updatedAt: p.wallet?.updatedAt ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Self-service top-up (added Sep 7, 2026) — a parent adding real money to
// their own Wallet via Razorpay. Same two-step order/verify shape as
// Enrollment and DemoBooking payments (src/lib/razorpay.ts,
// enrollment.service.ts), with the same webhook-reconciliation fallback for
// a client that never calls /verify (closed tab, dropped network).
//
// Bounds (WALLET_TOPUP_MIN_AMOUNT/MAX_AMOUNT) live in
// features/shared/utils/walletTopup.ts, not here — that file has no
// server-only imports, so the Parent-side useWallet hook can import the
// same numbers for client-side validation without pulling src/lib/razorpay.ts
// (which refuses to load outside a server context) into the browser bundle.
// ---------------------------------------------------------------------------

function assertValidTopupAmount(amount: number) {
  if (
    !Number.isFinite(amount) ||
    amount < WALLET_TOPUP_MIN_AMOUNT ||
    amount > WALLET_TOPUP_MAX_AMOUNT
  ) {
    throw new WalletError(
      `Enter an amount between ₹${WALLET_TOPUP_MIN_AMOUNT} and ₹${WALLET_TOPUP_MAX_AMOUNT}.`,
    );
  }
}

/**
 * Step 1 of the top-up flow. Writes nothing to the DB — just creates
 * a Razorpay Order for the amount the parent chose and returns it
 * for the client to open Checkout against. The amount itself is
 * stamped into the order's notes (`amountRupees`) so verify/webhook
 * reconciliation never has to trust anything the client sends back
 * later — only what Razorpay confirms was actually paid.
 */
export async function createWalletTopupOrder(parentId: string, amount: number) {
  assertValidTopupAmount(amount);

  const roundedAmount = Math.round(amount * 100) / 100;
  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: rupeesToPaise(roundedAmount),
    currency: "INR",
    // Razorpay caps receipt at 40 chars — keep it short.
    receipt: `wtop_${Date.now()}`,
    notes: {
      kind: "wallet_topup",
      parentId,
      amountRupees: String(roundedAmount),
    },
  });

  return order;
}

export interface VerifyWalletTopupInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Step 2 of the top-up flow. Re-verifies the checkout signature,
 * re-fetches the order from Razorpay directly, confirms it belongs
 * to this parent, and only then credits the Wallet — for the
 * credited amount, trusts Razorpay's own `order.amount`, never a
 * client-supplied number.
 *
 * Idempotent on `razorpayOrderId` (unique on WalletTransaction) —
 * calling this twice for the same order (a retried client request)
 * just returns the already-created transaction instead of
 * double-crediting.
 */
export async function verifyWalletTopup(
  parentId: string,
  input: VerifyWalletTopupInput,
) {
  const existing = await prisma.walletTransaction.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (existing) {
    return existing;
  }

  const signatureOk = verifyCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureOk) {
    throw new WalletError(
      "Payment verification failed. If money was deducted, it will be auto-refunded — contact support if it isn't reversed within a few days.",
      400,
    );
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(input.razorpayOrderId);

  if (order.status !== "paid") {
    throw new WalletError(
      `Payment isn't complete yet (status: ${order.status}). Please retry the payment.`,
      402,
    );
  }

  const notes = order.notes ?? {};

  if (notes.kind !== "wallet_topup" || String(notes.parentId) !== parentId) {
    throw new WalletError("This payment doesn't match your account.", 409);
  }

  const amount = Number(order.amount) / 100;

  const { transaction } = await creditWallet({
    parentId,
    amount,
    reason: "Wallet top-up",
    referenceType: "WALLET_TOPUP",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  return transaction;
}

/**
 * Webhook reconciliation fallback for a top-up — same role as
 * `reconcileEnrollmentFromWebhook` / `reconcileDemoBookingFromWebhook`
 * in the other payment flows: catches a payment that captured on
 * Razorpay's side but whose client never called `/verify`.
 */
export async function reconcileWalletTopupFromWebhook(
  orderId: string,
  paymentId: string,
) {
  const existing = await prisma.walletTransaction.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    return existing;
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(orderId);

  if (order.status !== "paid") {
    return null;
  }

  const notes = order.notes ?? {};

  if (notes.kind !== "wallet_topup") {
    return null;
  }

  const parentId = String(notes.parentId ?? "");

  if (!parentId) {
    console.error("Razorpay webhook: wallet top-up order missing parentId", orderId);
    return null;
  }

  const amount = Number(order.amount) / 100;

  const { transaction } = await creditWallet({
    parentId,
    amount,
    reason: "Wallet top-up",
    referenceType: "WALLET_TOPUP",
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  });

  return transaction;
}
