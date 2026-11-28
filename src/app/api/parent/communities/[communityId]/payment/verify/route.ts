import { NextResponse } from "next/server";

import { verifyCommunityPayment } from "@/features/community/server/communityPayment.service";
import { runParentCommunityRoute } from "@/features/community/server/parentRoute";

/**
 * POST — step 2 of paying to join a paid community. Re-verifies the checkout
 * signature, re-fetches the order from Razorpay, then records the payment,
 * joins the Parent and writes the invoice. Safe to call twice for one order.
 *
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runParentCommunityRoute(
    req,
    "Parent community payment verify error",
    "Payment succeeded but we couldn't add you to the community. Contact support with your payment ID.",
    async (parentId) => {
      const { communityId } = await params;
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

      const razorpayOrderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId : "";
      const razorpayPaymentId = typeof body.razorpayPaymentId === "string" ? body.razorpayPaymentId : "";
      const razorpaySignature = typeof body.razorpaySignature === "string" ? body.razorpaySignature : "";

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json({ error: "Missing Razorpay payment details." }, { status: 400 });
      }

      const payment = await verifyCommunityPayment(communityId, parentId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      return NextResponse.json({ success: true, paymentId: payment.id }, { status: 201 });
    },
  );
}
