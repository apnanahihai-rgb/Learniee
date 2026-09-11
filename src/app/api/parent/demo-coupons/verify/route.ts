import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  verifyDemoCouponPurchase,
  DemoBookingError,
  type VerifyDemoCouponPurchaseInput,
} from "@/features/parent/server/demoCoupon.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * POST
 *
 * Step 2 of the "buy extra demo coupons" flow. Re-verifies the
 * checkout signature, re-fetches the order from Razorpay directly,
 * re-checks the charged amount against the quantity, and only then
 * bumps DemoCoupon.totalIssued — see demoCoupon.service.ts.
 *
 * Body: { quantity, razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: VerifyDemoCouponPurchaseInput = await req.json();

    if (
      !input.razorpayOrderId ||
      !input.razorpayPaymentId ||
      !input.razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Missing Razorpay payment details." },
        { status: 400 },
      );
    }

    const quantity = Number(input.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "A valid coupon quantity is required." },
        { status: 400 },
      );
    }

    const purchase = await verifyDemoCouponPurchase(parent.parentId, {
      ...input,
      quantity,
    });

    await logActivity({
      action: "PAYMENT_DEMO_COUPON_PURCHASE",
      actorRole: "PARENT",
      actorId: parent.parentId,
      description: `Demo coupon purchase received — ${purchase.quantity} coupon${
        purchase.quantity === 1 ? "" : "s"
      } for ₹${purchase.amount} (Purchase ${purchase.id}).`,
      metadata: {
        purchaseId: purchase.id,
        quantity: purchase.quantity,
        amount: Number(purchase.amount),
        razorpayPaymentId: purchase.razorpayPaymentId,
      },
    });

    return NextResponse.json({ success: true, purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof DemoBookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent demo-coupons/verify POST error:", error);

    return NextResponse.json(
      {
        error:
          "Payment succeeded but your coupons couldn't be added — contact support with your payment ID.",
      },
      { status: 500 },
    );
  }
}
