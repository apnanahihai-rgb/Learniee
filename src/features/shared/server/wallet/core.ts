import { generateInvoiceForPayment } from "@/features/shared/server/invoice.service";
import { notifyWalletCredited } from "@/features/shared/server/notificationTriggers.service";
import { prisma } from "@/lib/prisma";
import { InvoiceType, Prisma, WalletTransactionType } from "@prisma/client";

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
 * Money leaves a Wallet only through `debitWalletInTx()` / `debitWallet()`.
 * Oct 15, 2026: a Parent can now spend the balance on an Enrollment's first
 * cycle and on a renewal (`enrollment/wallet.ts`, `renewal/wallet.ts`), always
 * as the whole price (no part-wallet / part-card split) and always inside the
 * same transaction that creates what was paid for (06-OPEN-DECISIONS.md #44).
 *
 * Balance writes are atomic in the database (`increment` / `decrement`, and a
 * debit is conditional on `balance >= amount`), so two concurrent requests can
 * neither overwrite each other nor push a Wallet below zero.
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
  /** Top-up only: what the invoice shows when it differs from the credit (credit + international fee). */
  invoiceAmount?: number;
  invoiceDescription?: string;
}
/** Rupees to 2 decimals, so float noise never reaches a Decimal(10,2) column. */
function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
function assertValidAdjustment(input: WalletAdjustmentInput) {
  if (!input.parentId) {
    throw new WalletError("parentId is required.");
  }

  if (!Number.isFinite(input.amount) || roundMoney(input.amount) <= 0) {
    throw new WalletError("Amount must be a positive number.");
  }

  if (!input.reason?.trim()) {
    throw new WalletError("A reason is required for every wallet transaction.");
  }
}
/**
 * The balance + WalletTransaction write, for a caller that already has a
 * transaction open (e.g. an approved refund, which must be marked APPROVED and
 * credited atomically). No notification here — send it after the outer
 * transaction commits.
 */
export async function creditWalletInTx(
  tx: Prisma.TransactionClient,
  input: WalletAdjustmentInput,
) {
  assertValidAdjustment(input);

  const amount = roundMoney(input.amount);

  // Atomic: the row is created if missing, then incremented IN the database,
  // never read-then-written from JS (that lost updates under concurrent calls).
  const existing = await tx.wallet.upsert({
    where: { parentId: input.parentId },
    create: { parentId: input.parentId, balance: 0 },
    update: {},
  });

  const updatedWallet = await tx.wallet.update({
    where: { id: existing.id },
    data: { balance: { increment: amount } },
  });

  const wallet = updatedWallet;
  const balanceAfter = Number(updatedWallet.balance);

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: WalletTransactionType.CREDIT,
      amount,
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
}
/**
 * Credits a parent's Wallet — the only way money enters a Wallet
 * today. Creates the Wallet row on first use, same as
 * getOrCreateWallet(). Runs inside a transaction so the balance
 * update and the WalletTransaction row can never drift apart.
 */
export async function creditWallet(input: WalletAdjustmentInput) {
  assertValidAdjustment(input);

  const result = await prisma.$transaction((tx) => creditWalletInTx(tx, input));

  await notifyWalletCredited(input.parentId, input.amount, input.reason);

  // Invoices (Sep 11, 2026) — only self-funded top-ups (the caller
  // passes `razorpayOrderId`) are a real payment worth a receipt.
  // Accounts' manual credits (refunds, adjustments) go through this
  // exact same function with no Razorpay ids attached — those
  // deliberately stay un-invoiced, since there's no gateway charge
  // behind them to receipt (see the Invoice model's doc-comment).
  if (input.razorpayOrderId) {
    try {
      await generateInvoiceForPayment({
        type: InvoiceType.WALLET_TOPUP,
        payerId: input.parentId,
        amount: input.invoiceAmount ?? input.amount,
        description: input.invoiceDescription ?? "Wallet top-up",
        referenceType: "WALLET_TOPUP",
        referenceId: result.transaction.id,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      });
    } catch (err) {
      console.error("Invoice generation failed (wallet top-up still succeeded):", err);
    }
  }

  return result;
}
/**
 * The debit write, for a caller that already has a transaction open (e.g.
 * paying an Enrollment from the Wallet, which must create the Enrollment and
 * take the money atomically). Throws `WalletError` (402) if the balance is
 * too low — and because it runs inside the caller's transaction, whatever the
 * caller already wrote is rolled back with it.
 *
 * The balance check and the decrement are ONE conditional UPDATE
 * (`balance >= amount`), so concurrent debits cannot overdraw the Wallet.
 */
export async function debitWalletInTx(
  tx: Prisma.TransactionClient,
  input: WalletAdjustmentInput,
) {
  assertValidAdjustment(input);

  const amount = roundMoney(input.amount);

  const debited = await tx.wallet.updateMany({
    where: { parentId: input.parentId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });

  if (debited.count === 0) {
    throw new WalletError("Insufficient wallet balance for this payment.", 402);
  }

  // Our UPDATE holds the row lock until the transaction ends, so this read
  // returns exactly the balance our debit produced.
  const wallet = await tx.wallet.findUniqueOrThrow({
    where: { parentId: input.parentId },
  });

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: WalletTransactionType.DEBIT,
      amount,
      balanceAfter: Number(wallet.balance),
      reason: input.reason.trim(),
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdByStaffSub: input.createdByStaffSub,
    },
  });

  return { wallet, transaction };
}
/**
 * Standalone debit (own transaction). Prefer `debitWalletInTx` when the debit
 * belongs to a larger write.
 */
export async function debitWallet(input: WalletAdjustmentInput) {
  return prisma.$transaction((tx) => debitWalletInTx(tx, input));
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
