import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { getInvoiceForAccounts } from "@/features/shared/server/invoice.service";

/**
 * GET — a single invoice, with the payer's name/email attached, for
 * Accounts/Admin. No ownership scoping (unlike the Parent-facing
 * lookup) — Accounts/Admin can look up any invoice.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { invoiceId } = await params;
    const invoice = await getInvoiceForAccounts(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Accounts invoice GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch this invoice." },
      { status: 500 },
    );
  }
}
