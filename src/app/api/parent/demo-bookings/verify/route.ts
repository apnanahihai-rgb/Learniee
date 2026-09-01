import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  verifyDemoBookingPayment,
  DemoBookingError,
  type VerifyDemoBookingPaymentInput,
} from "@/features/parent/server/demoCoupon.service";

/**
 * POST
 *
 * Step 2 of the paid-demo flow. Re-verifies the Razorpay payment
 * server-side and only then creates the DemoBooking row — see
 * demoCoupon.service.ts.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: VerifyDemoBookingPaymentInput = await req.json();

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

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.scheduledAt) {
      return NextResponse.json(
        { error: "Pick a date and time for the demo before booking." },
        { status: 400 },
      );
    }

    const result = await verifyDemoBookingPayment(parent.parentId, input);

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof DemoBookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent demo-bookings/verify POST error:", error);

    return NextResponse.json(
      { error: "Failed to confirm demo payment." },
      { status: 500 },
    );
  }
}
