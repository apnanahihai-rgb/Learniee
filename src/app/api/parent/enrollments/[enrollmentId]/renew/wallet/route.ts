import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { renewWithWallet, RenewalError } from "@/features/parent/server/renewal.service";
import { WalletError } from "@/features/shared/server/wallet.service";

/**
 * POST
 *
 * body: { requestId: string, scheduleDays?: number[], scheduleTime?: string }
 *
 * Renews the next cycle from the Parent's Wallet balance — the wallet
 * alternative to `/renew/order` + `/renew/verify`. `requestId` is a
 * client-generated UUID that makes a retry safe. The whole price must be
 * covered by the balance (402 otherwise).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const { enrollmentId } = await params;
    const body = await req.json().catch(() => ({}));

    const { cycle } = await renewWithWallet(enrollmentId, parent.parentId, {
      requestId: body.requestId,
      scheduleDays: body.scheduleDays,
      scheduleTime: body.scheduleTime,
    });

    return NextResponse.json({ success: true, cycle });
  } catch (error) {
    if (error instanceof RenewalError || error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent enrollments/renew/wallet POST error:", error);

    return NextResponse.json(
      { error: "Failed to renew from your wallet." },
      { status: 500 },
    );
  }
}
