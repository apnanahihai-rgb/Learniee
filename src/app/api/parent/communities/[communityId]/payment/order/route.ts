import { NextResponse } from "next/server";

import { createCommunityPaymentOrder } from "@/features/community/server/communityPayment.service";
import { runParentCommunityRoute } from "@/features/community/server/parentRoute";
import { getRazorpayKeyId } from "@/lib/razorpay";
import { parsePaymentMethod } from "@/lib/transactionCharges";

/**
 * POST — step 1 of paying to join a paid community. Creates a Razorpay Order
 * and writes nothing to the DB. The client opens Checkout against the returned
 * order, then calls `.../payment/verify`.
 *
 * Verified Parent auth (a forged token here would be a real charge on the
 * wrong account). Body: { paymentMethod: "UPI" | "OTHER" }
 */
export async function POST(req: Request, { params }: { params: Promise<{ communityId: string }> }) {
  return runParentCommunityRoute(
    req,
    "Parent community payment order error",
    "Failed to start your payment.",
    async (parentId) => {
      const { communityId } = await params;
      const body: unknown = await req.json().catch(() => ({}));
      const method = parsePaymentMethod(
        body && typeof body === "object" ? (body as Record<string, unknown>).paymentMethod : undefined,
      );

      const { order, totalPayable, communityTitle } = await createCommunityPaymentOrder(communityId, parentId, method);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        totalPayable,
        communityTitle,
      });
    },
  );
}
