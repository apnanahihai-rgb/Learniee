import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getInvoiceForParent } from "@/features/shared/server/invoice.service";

/**
 * GET
 *
 * A single invoice, scoped to the logged-in parent — used by the
 * printable invoice detail view on `/parent/payments/[invoiceId]`.
 * Returns 404 (not 403) if the invoice belongs to someone else, so
 * this never confirms another parent's invoice ID is valid.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const { invoiceId } = await params;
    const invoice = await getInvoiceForParent(parent.parentId, invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Parent invoice GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch this invoice." },
      { status: 500 },
    );
  }
}
