import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import { verifyWalletTopup, WalletError } from "@/features/shared/server/wallet.service";

/**
 * POST
 *
 * Step 2 of the wallet top-up flow. Re-verifies the checkout
 * signature, re-fetches the order from Razorpay directly, and only
 * then credits the Wallet — never trusts a client-supplied amount.
 * Idempotent on `razorpayOrderId`, same as the Enrollment/DemoBooking
 * verify routes.
 *
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body ?? {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing payment verification details." },
        { status: 400 },
      );
    }

    const transaction = await verifyWalletTopup(parent.parentId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent wallet/verify POST error:", error);

    return NextResponse.json(
      {
        error:
          "Payment succeeded but your wallet couldn't be updated — contact support with your payment ID.",
      },
      { status: 500 },
    );
  }
}
