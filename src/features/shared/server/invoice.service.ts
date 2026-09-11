import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { InvoiceType, InvoicePayerRole } from "@prisma/client";

/**
 * Invoices (Sep 11, 2026). See the `Invoice` model's doc-comment in
 * schema.prisma for the full reasoning. This file is the single
 * choke point every payment path should call through — same
 * convention `notification.service.ts` / `activityLog.service.ts`
 * already established — so "what counts as an invoiceable payment"
 * stays defined in one place instead of being re-decided at every
 * call site.
 */

export interface GenerateInvoiceInput {
  type: InvoiceType;
  payerId: string;
  amount: number;
  description: string;
  /** e.g. "ENROLLMENT", "DEMO_BOOKING", "WALLET_TOPUP" — pairs with referenceId for the @@index lookup. */
  referenceType: string;
  referenceId: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}

const INVOICE_NUMBER_PAD = 6;

function formatInvoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(INVOICE_NUMBER_PAD, "0")}`;
}

/**
 * Creates the Invoice row for a completed payment. Idempotent on
 * `razorpayOrderId` — every payment path in this app has two
 * creation call sites (the client-driven `/verify` route, and the
 * webhook reconciliation fallback for a client that never called
 * back), and both call this, so the guard below is what stops a
 * payment from ever getting two invoices.
 *
 * Never throws in a way that should block the payment it's attached
 * to — callers wrap this the same way `notifyXxx()` triggers are
 * wrapped (log, don't rethrow), since a receipt failing to generate
 * must never be allowed to roll back money that already moved.
 *
 * `invoiceNumber` is written in a second statement inside the same
 * transaction: the row is first created with a guaranteed-unique
 * placeholder (its own id), then updated to the human-readable
 * "INV-000123" string formatted from the DB-assigned `invoiceSeq`.
 * Postgres's transaction isolation means no other request can ever
 * observe the placeholder value in between.
 */
export async function generateInvoiceForPayment(input: GenerateInvoiceInput) {
  if (input.razorpayOrderId) {
    const existing = await prisma.invoice.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
    });

    if (existing) {
      return existing;
    }
  }

  return prisma.$transaction(async (tx) => {
    const id = randomUUID();

    const created = await tx.invoice.create({
      data: {
        id,
        // Placeholder — guaranteed unique since it's the row's own
        // id — overwritten below once invoiceSeq is known.
        invoiceNumber: id,
        type: input.type,
        payerId: input.payerId,
        payerRole: InvoicePayerRole.PARENT,
        amount: input.amount,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        razorpayOrderId: input.razorpayOrderId ?? null,
        razorpayPaymentId: input.razorpayPaymentId ?? null,
      },
    });

    return tx.invoice.update({
      where: { id },
      data: { invoiceNumber: formatInvoiceNumber(created.invoiceSeq) },
    });
  });
}

/** The logged-in Parent's own invoices, newest first — `/parent/payments`. */
export async function listInvoicesForParent(parentId: string) {
  return prisma.invoice.findMany({
    where: { payerId: parentId, payerRole: InvoicePayerRole.PARENT },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A single invoice, scoped to the requesting Parent — returns null
 * (not a 403) if the invoice exists but belongs to someone else, so
 * the route can 404 rather than confirm another parent's invoice ID
 * is valid.
 */
export async function getInvoiceForParent(parentId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice || invoice.payerId !== parentId || invoice.payerRole !== InvoicePayerRole.PARENT) {
    return null;
  }

  return invoice;
}

export interface AccountsInvoiceRow {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  amount: number;
  currency: string;
  description: string;
  referenceType: string;
  referenceId: string;
  razorpayPaymentId: string | null;
  issuedAt: Date;
  payerName: string;
  payerEmail: string;
}

/**
 * Batch-resolves a page of Invoices' `payerId` into a display name +
 * email. Invoice's payer pointer is loosely-typed (no FK — same
 * reasoning as `Notification.recipientId`), so this is a second
 * lookup rather than an `include`, same pattern
 * `notificationTriggers.service.ts` already uses for its own
 * loosely-typed pointers. `payerRole` is always PARENT today (see
 * the model's doc-comment), so only `ParentProfile` is queried.
 */
async function attachPayerNames(
  invoices: {
    id: string;
    invoiceNumber: string;
    type: InvoiceType;
    amount: unknown;
    currency: string;
    description: string;
    referenceType: string;
    referenceId: string;
    razorpayPaymentId: string | null;
    issuedAt: Date;
    payerId: string;
  }[],
): Promise<AccountsInvoiceRow[]> {
  const payerIds = Array.from(new Set(invoices.map((i) => i.payerId)));

  const parents = await prisma.parentProfile.findMany({
    where: { id: { in: payerIds } },
    select: { id: true, firstName: true, lastName: true, visibleName: true, email: true },
  });

  const byId = new Map(parents.map((p) => [p.id, p]));

  return invoices.map((invoice) => {
    const parent = byId.get(invoice.payerId);
    const payerName =
      parent?.visibleName || [parent?.firstName, parent?.lastName].filter(Boolean).join(" ").trim() || "Unknown parent";

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      description: invoice.description,
      referenceType: invoice.referenceType,
      referenceId: invoice.referenceId,
      razorpayPaymentId: invoice.razorpayPaymentId,
      issuedAt: invoice.issuedAt,
      payerName,
      payerEmail: parent?.email ?? "",
    };
  });
}

/** Every invoice, newest first, with payer name/email attached — Accounts/Admin's `/accounts` Invoices tab. */
export async function listInvoicesForAccounts(): Promise<AccountsInvoiceRow[]> {
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
  return attachPayerNames(invoices);
}

/** A single invoice for Accounts/Admin — no ownership scoping, unlike the Parent-facing lookup. */
export async function getInvoiceForAccounts(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return null;
  }

  const [row] = await attachPayerNames([invoice]);
  return row;
}
